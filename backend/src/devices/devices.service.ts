import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
import { Device, DeviceStatus } from './entities/device.entity';
import { BorrowRequest, BorrowRequestStatus } from '../borrow-requests/entities/borrow-request.entity';
import { MaintenanceRecord, MaintenanceStatus } from '../maintenance/entities/maintenance.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateDeviceDto) {
    const existingCode = await this.deviceRepository.findOne({ where: { code: createDto.code } });
    if (existingCode) {
      throw new ConflictException('Mã thiết bị đã tồn tại');
    }

    if (createDto.serial_number) {
      const existingSerial = await this.deviceRepository.findOne({ where: { serial_number: createDto.serial_number } });
      if (existingSerial) {
        throw new ConflictException('Serial number đã tồn tại');
      }
    }

    const device = this.deviceRepository.create(createDto);
    return this.deviceRepository.save(device);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, category_id?: string, status?: DeviceStatus) {
    const queryBuilder = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.category', 'category')
      .where('device.is_deleted = :isDeleted', { isDeleted: false });

    if (search) {
      queryBuilder.andWhere(
        '(device.name LIKE :search OR device.code LIKE :search OR device.serial_number LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category_id) {
      queryBuilder.andWhere('device.device_categories_id = :category_id', { category_id });
    }

    if (status) {
      queryBuilder.andWhere('device.status = :status', { status });
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const device = await this.deviceRepository.findOne({
      where: { id, is_deleted: false },
      relations: { category: true }
    });
    
    if (!device) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }
    return device;
  }

  async update(id: string, updateDto: UpdateDeviceDto) {
    const device = await this.findOne(id);

    if (updateDto.code && updateDto.code !== device.code) {
      const existingCode = await this.deviceRepository.findOne({ where: { code: updateDto.code } });
      if (existingCode) {
        throw new ConflictException('Mã thiết bị đã tồn tại');
      }
    }

    if (updateDto.serial_number && updateDto.serial_number !== device.serial_number) {
      const existingSerial = await this.deviceRepository.findOne({ where: { serial_number: updateDto.serial_number } });
      if (existingSerial) {
        throw new ConflictException('Serial number đã tồn tại');
      }
    }

    Object.assign(device, updateDto);
    return this.deviceRepository.save(device);
  }

  async remove(id: string) {
    const device = await this.findOne(id);

    if (device.status !== DeviceStatus.Available) {
      throw new ConflictException(`Không thể xóa thiết bị đang ở trạng thái ${device.status}`);
    }

    device.is_deleted = true;
    await this.deviceRepository.save(device);
    return { message: 'Xóa thiết bị thành công' };
  }

  async reportIssue(deviceId: string, userId: string, reportIssueDto: ReportIssueDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const device = await queryRunner.manager.findOne(Device, {
        where: { id: deviceId, is_deleted: false },
        lock: { mode: 'pessimistic_write' },
      });

      if (!device) {
        throw new NotFoundException('Không tìm thấy thiết bị');
      }

      if (device.status !== DeviceStatus.Borrowed) {
        throw new BadRequestException(`Chỉ có thể báo lỗi khi thiết bị đang ở trạng thái 'Borrowed'. Trạng thái hiện tại: ${device.status}`);
      }

      const activeBorrow = await queryRunner.manager.findOne(BorrowRequest, {
        where: {
          device_id: deviceId,
          users_id: userId,
          status: BorrowRequestStatus.Approved,
        },
      });

      if (!activeBorrow) {
        throw new ForbiddenException('Bạn không có quyền báo lỗi thiết bị này vì bạn không phải là người đang mượn');
      }

      device.status = DeviceStatus.Maintenance;
      await queryRunner.manager.save(device);

      const maintenanceRecord = queryRunner.manager.create(MaintenanceRecord, {
        device_id: deviceId,
        reported_by: userId,
        issue: reportIssueDto.issue,
        notes: reportIssueDto.notes,
        status: MaintenanceStatus.InProgress,
        start_date: new Date(),
      });
      const savedRecord = await queryRunner.manager.save(maintenanceRecord);

      await queryRunner.commitTransaction();

      return {
        message: 'Báo lỗi thiết bị thành công. Thiết bị đã được chuyển sang trạng thái bảo trì.',
        maintenance_record: savedRecord,
        device: {
          id: device.id,
          code: device.code,
          name: device.name,
          status: device.status,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

