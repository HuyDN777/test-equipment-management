import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BorrowRequest, BorrowRequestStatus } from './entities/borrow-request.entity';
import { Device, DeviceStatus } from '../devices/entities/device.entity';
import { CreateBorrowRequestDto } from './dto/create-borrow-request.dto';
import { RejectBorrowRequestDto, ReturnDeviceDto, BorrowFilterDto } from './dto/borrow-action.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class BorrowRequestsService {
  constructor(
    @InjectRepository(BorrowRequest)
    private borrowRequestRepository: Repository<BorrowRequest>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dataSource: DataSource,
  ) {}

  async create(userId: string, createDto: CreateBorrowRequestDto) {
    const device = await this.deviceRepository.findOne({
      where: { id: createDto.device_id, is_deleted: false },
    });

    if (!device) {
      throw new NotFoundException('Thiết bị không tồn tại');
    }

    if (device.status !== DeviceStatus.Available) {
      throw new BadRequestException('Thiết bị hiện không sẵn sàng để mượn');
    }

    const borrowRequest = this.borrowRequestRepository.create({
      device_id: createDto.device_id,
      users_id: userId,
      borrow_date: new Date(createDto.borrow_date),
      due_date: new Date(createDto.due_date),
      reason: createDto.reason,
      status: BorrowRequestStatus.Pending,
    });

    return this.borrowRequestRepository.save(borrowRequest);
  }

  async findAll(filter: BorrowFilterDto, currentUser: { userId: string; role: UserRole }) {
    const { status, user_id, device_id, page = 1, limit = 10 } = filter;
    const query = this.borrowRequestRepository
      .createQueryBuilder('borrow')
      .leftJoinAndSelect('borrow.device', 'device')
      .leftJoinAndSelect('borrow.user', 'user')
      .orderBy('borrow.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (currentUser.role !== UserRole.Admin) {
      query.andWhere('borrow.users_id = :currentUserId', { currentUserId: currentUser.userId });
    } else if (user_id) {
      query.andWhere('borrow.users_id = :userId', { userId: user_id });
    }

    if (status) {
      query.andWhere('borrow.status = :status', { status });
    }

    if (device_id) {
      query.andWhere('borrow.device_id = :deviceId', { deviceId: device_id });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const request = await this.borrowRequestRepository.findOne({
      where: { id },
      relations: { device: true, user: true },
    });

    if (!request) {
      throw new NotFoundException('Yêu cầu mượn thiết bị không tồn tại');
    }

    return request;
  }

  async approve(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const borrowRequest = await queryRunner.manager.findOne(BorrowRequest, {
        where: { id },
        relations: { device: true },
      });

      if (!borrowRequest) {
        throw new NotFoundException('Yêu cầu mượn không tồn tại');
      }

      if (borrowRequest.status !== BorrowRequestStatus.Pending) {
        throw new BadRequestException('Chỉ có thể duyệt yêu cầu đang ở trạng thái Chờ duyệt (Pending)');
      }

      const device = await queryRunner.manager.findOne(Device, {
        where: { id: borrowRequest.device_id, is_deleted: false },
        lock: { mode: 'pessimistic_write' },
      });

      if (!device) {
        throw new NotFoundException('Thiết bị không tồn tại');
      }

      if (device.status !== DeviceStatus.Available) {
        throw new BadRequestException('Thiết bị hiện không ở trạng thái Sẵn sàng (Available) để duyệt mượn');
      }

      device.status = DeviceStatus.Borrowed;
      await queryRunner.manager.save(device);

      borrowRequest.status = BorrowRequestStatus.Approved;
      const savedRequest = await queryRunner.manager.save(borrowRequest);

      await queryRunner.commitTransaction();
      return savedRequest;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reject(id: string, rejectDto: RejectBorrowRequestDto) {
    const borrowRequest = await this.findOne(id);

    if (borrowRequest.status !== BorrowRequestStatus.Pending) {
      throw new BadRequestException('Chỉ có thể từ chối yêu cầu đang ở trạng thái Chờ duyệt (Pending)');
    }

    borrowRequest.status = BorrowRequestStatus.Rejected;
    borrowRequest.rejection_reason = rejectDto.rejection_reason;

    return this.borrowRequestRepository.save(borrowRequest);
  }

  async returnDevice(id: string, returnDto?: ReturnDeviceDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const borrowRequest = await queryRunner.manager.findOne(BorrowRequest, {
        where: { id },
        relations: { device: true },
      });

      if (!borrowRequest) {
        throw new NotFoundException('Yêu cầu mượn không tồn tại');
      }

      if (borrowRequest.status !== BorrowRequestStatus.Approved) {
        throw new BadRequestException('Chỉ có thể trả thiết bị cho yêu cầu đã được duyệt (Approved)');
      }

      const device = await queryRunner.manager.findOne(Device, {
        where: { id: borrowRequest.device_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (device) {
        device.status = DeviceStatus.Available;
        await queryRunner.manager.save(device);
      }

      borrowRequest.status = BorrowRequestStatus.Returned;
      borrowRequest.return_date = new Date();
      const savedRequest = await queryRunner.manager.save(borrowRequest);

      await queryRunner.commitTransaction();
      return savedRequest;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(id: string, currentUser: { userId: string; role: UserRole }) {
    const borrowRequest = await this.findOne(id);

    if (currentUser.role !== UserRole.Admin && borrowRequest.users_id !== currentUser.userId) {
      throw new ForbiddenException('Bạn không có quyền hủy yêu cầu mượn này');
    }

    if (borrowRequest.status !== BorrowRequestStatus.Pending) {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu đang ở trạng thái Chờ duyệt (Pending)');
    }

    borrowRequest.status = BorrowRequestStatus.Cancelled;
    return this.borrowRequestRepository.save(borrowRequest);
  }
}
