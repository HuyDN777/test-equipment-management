import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { BorrowRequest, BorrowRequestStatus, IssuedAccessory } from './entities/borrow-request.entity';
import { Device, DeviceStatus } from '../devices/entities/device.entity';
import { AccessoryStock } from '../devices/entities/accessory-stock.entity';
import { CreateBorrowRequestDto } from './dto/create-borrow-request.dto';
import { ApproveBorrowRequestDto, BorrowFilterDto, RejectBorrowRequestDto, ReturnDeviceDto } from './dto/borrow-action.dto';
import { UserRole } from '../users/entities/user.entity';
import { DeviceModel } from '../devices/entities/device-model.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { MaintenanceRecord, MaintenanceStatus } from '../maintenance/entities/maintenance.entity';

type CurrentUser = { userId: string; role: UserRole };

@Injectable()
export class BorrowRequestsService {
  constructor(
    @InjectRepository(BorrowRequest) private readonly borrowRequestRepository: Repository<BorrowRequest>,
    @InjectRepository(Device) private readonly deviceRepository: Repository<Device>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateBorrowRequestDto) {
    if (!dto.device_model_id && !dto.device_id) {
      throw new BadRequestException('Cần cung cấp device_model_id');
    }
    const borrowDate = new Date(dto.borrow_date);
    const dueDate = new Date(dto.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (borrowDate < today) throw new BadRequestException('Ngày mượn không được ở trong quá khứ');
    if (dueDate < borrowDate) {
      throw new BadRequestException('Ngày trả không được trước ngày mượn');
    }

    const requestedAccessories = (dto.requested_accessories ?? []).map(item => ({
      accessory_id: item.accessory_id,
      name: item.name?.trim(),
      quantity: item.quantity,
    }));
    if (requestedAccessories.some(item => !item.name || item.name.length > 100
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1)
      || new Set(requestedAccessories.map(item => item.accessory_id)).size !== requestedAccessories.length) {
      throw new BadRequestException('Danh sách phụ kiện yêu cầu không hợp lệ hoặc bị trùng');
    }

    return this.inTransaction(async manager => {
      let deviceModelId = dto.device_model_id;
      if (!deviceModelId && dto.device_id) {
        const requestedAsset = await manager.findOne(Device, {
          where: { id: dto.device_id, is_deleted: false },
        });
        if (!requestedAsset) throw new NotFoundException('Thiết bị không tồn tại');
        deviceModelId = requestedAsset.device_model_id;
      }

      const deviceModel = await manager.findOne(DeviceModel, {
        where: { id: deviceModelId!, is_deleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!deviceModel) throw new NotFoundException('Model thiết bị không tồn tại');

      const duplicate = await manager.findOne(BorrowRequest, {
        where: {
          device_model_id: deviceModel.id,
          users_id: userId,
          status: BorrowRequestStatus.Pending,
        },
      });
      if (duplicate) {
        throw new BadRequestException('Bạn đã có một yêu cầu đang chờ duyệt cho thiết bị này');
      }

      if (requestedAccessories.length) {
        const accessoryStock = await manager.createQueryBuilder(AccessoryStock, 'stock')
          .innerJoin('stock.compatibleModels', 'compatibleModel', 'compatibleModel.id = :modelId', { modelId: deviceModel.id })
          .where('stock.id IN (:...ids)', { ids: requestedAccessories.map(item => item.accessory_id) })
          .andWhere('stock.is_deleted = false')
          .getMany();
        const stockById = new Map(accessoryStock.map(item => [item.id, item]));
        for (const item of requestedAccessories) {
          const stock = stockById.get(item.accessory_id);
          if (!stock || stock.name.toLocaleLowerCase() !== item.name.toLocaleLowerCase()
            || item.quantity > stock.available_quantity) {
            throw new BadRequestException(`Số lượng ${item.name} yêu cầu vượt quá số tối đa hiện có`);
          }
        }
      }

      const request = manager.create(BorrowRequest, {
        device_model_id: deviceModel.id, device_id: null, users_id: userId,
        borrow_date: borrowDate, due_date: dueDate,
        reason: dto.reason, requested_accessories: requestedAccessories,
        status: BorrowRequestStatus.Pending,
      });
      const savedRequest = await manager.save(request);
      const requester = await manager.findOne(User, { where: { id: userId } });
      await this.notificationsService.notifyAdmins({
        title: 'Yêu cầu mượn mới',
        message: `${requester?.name || 'Một nhân viên'} vừa gửi yêu cầu mượn ${deviceModel.name}.`,
        type: NotificationType.BorrowRequestCreated,
        payload: { borrowRequestId: savedRequest.id, link: '/borrow-requests' },
      }, manager);
      return savedRequest;
    });
  }

  async findAll(filter: BorrowFilterDto, currentUser: CurrentUser) {
    const { status, user_id, device_id, device_model_id, page = 1, limit = 10 } = filter;
    const query = this.borrowRequestRepository.createQueryBuilder('borrow')
      .leftJoinAndSelect('borrow.device', 'device').leftJoinAndSelect('borrow.user', 'user')
      .leftJoinAndSelect('borrow.deviceModel', 'deviceModel')
      .orderBy('borrow.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    if (currentUser.role !== UserRole.Admin) {
      query.andWhere('borrow.users_id = :currentUserId', { currentUserId: currentUser.userId });
    } else if (user_id) query.andWhere('borrow.users_id = :userId', { userId: user_id });
    if (status) query.andWhere('borrow.status = :status', { status });
    if (device_id) query.andWhere('borrow.device_id = :deviceId', { deviceId: device_id });
    if (device_model_id) query.andWhere('borrow.device_model_id = :deviceModelId', { deviceModelId: device_model_id });
    const [items, total] = await query.getManyAndCount();
    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const request = await this.borrowRequestRepository.findOne({
      where: { id }, relations: { device: true, deviceModel: true, user: true },
    });
    if (!request) throw new NotFoundException('Yêu cầu mượn thiết bị không tồn tại');
    return request;
  }

  async findOneForUser(id: string, currentUser: CurrentUser) {
    const request = await this.findOne(id);
    if (currentUser.role !== UserRole.Admin && request.users_id !== currentUser.userId) {
      throw new ForbiddenException('Bạn không có quyền xem yêu cầu mượn này');
    }
    return request;
  }

  async approve(id: string, dto: ApproveBorrowRequestDto = {}) {
    return this.inTransaction(async manager => {
      const request = await this.findOneForUpdate(manager, id);
      this.requireStatus(request, BorrowRequestStatus.Pending, 'duyệt');
      const device = await manager.findOne(Device, {
        where: {
          ...(dto.device_id ? { id: dto.device_id } : {}),
          device_model_id: request.device_model_id,
          status: DeviceStatus.Available,
          is_deleted: false,
        },
        order: { created_at: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device) throw new BadRequestException('Model này hiện không còn thiết bị sẵn sàng');
      const issued = dto.accessories ?? [];
      if (new Set(issued.map(item => item.accessory_id)).size !== issued.length) {
        throw new BadRequestException('Phụ kiện bàn giao bị trùng');
      }
      const requestedById = new Map((request.requested_accessories ?? [])
        .filter(item => typeof item !== 'string' && item.accessory_id)
        .map(item => [(item as { accessory_id: string }).accessory_id, item as { name: string; quantity: number }]));
      const requestedByName = new Map((request.requested_accessories ?? []).map(item =>
        typeof item === 'string'
          ? [item.toLocaleLowerCase(), { name: item, quantity: 1 }] as const
          : [item.name.toLocaleLowerCase(), item] as const));
      const issuedSnapshot: IssuedAccessory[] = [];
      for (const item of [...issued].sort((a, b) => a.accessory_id.localeCompare(b.accessory_id))) {
        const stock = await manager.createQueryBuilder(AccessoryStock, 'stock')
          .innerJoin('stock.compatibleModels', 'compatibleModel', 'compatibleModel.id = :modelId', {
            modelId: request.device_model_id,
          })
          .where('stock.id = :stockId', { stockId: item.accessory_id })
          .andWhere('stock.is_deleted = false')
          .setLock('pessimistic_write')
          .getOne();
        if (!stock || !Number.isInteger(item.quantity) || item.quantity < 0 || item.quantity > stock.available_quantity) {
          throw new BadRequestException('Số lượng phụ kiện bàn giao không hợp lệ');
        }
        const requested = requestedById.get(stock.id) ?? requestedByName.get(stock.name.toLocaleLowerCase());
        if (item.quantity > 0 && (!requested || item.quantity > requested.quantity)) {
          throw new BadRequestException(`Số lượng ${stock.name} bàn giao vượt quá số nhân viên yêu cầu`);
        }
        if (item.quantity > 0) {
          stock.available_quantity -= item.quantity;
          await manager.save(AccessoryStock, stock);
          issuedSnapshot.push({ accessory_id: stock.id, name: stock.name, quantity: item.quantity });
        }
      }
      device.status = DeviceStatus.Borrowed;
      request.device_id = device.id;
      request.status = BorrowRequestStatus.Approved;
      request.issued_accessories = issuedSnapshot;
      await manager.save(device);
      const savedRequest = await manager.save(request);
      await this.notificationsService.create({
        user_id: request.users_id,
        title: 'Yêu cầu mượn đã được duyệt',
        message: `Thiết bị ${device.code} đã được cấp cho yêu cầu của bạn.`,
        type: NotificationType.BorrowRequestApproved,
        payload: { borrowRequestId: request.id, deviceId: device.id, link: '/my-requests' },
      }, manager);
      return savedRequest;
    });
  }

  async reject(id: string, dto: RejectBorrowRequestDto) {
    return this.inTransaction(async manager => {
      const request = await this.findOneForUpdate(manager, id);
      this.requireStatus(request, BorrowRequestStatus.Pending, 'từ chối');
      request.status = BorrowRequestStatus.Rejected;
      request.rejection_reason = dto.rejection_reason;
      const savedRequest = await manager.save(request);
      await this.notificationsService.create({
        user_id: request.users_id,
        title: 'Yêu cầu mượn bị từ chối',
        message: dto.rejection_reason
          ? `Lý do: ${dto.rejection_reason}`
          : 'Yêu cầu mượn của bạn không được phê duyệt.',
        type: NotificationType.BorrowRequestRejected,
        payload: { borrowRequestId: request.id, link: '/my-requests' },
      }, manager);
      return savedRequest;
    });
  }

  async returnDevice(id: string, dto?: ReturnDeviceDto) {
    return this.inTransaction(async manager => {
      const request = await this.findOneForUpdate(manager, id);
      if (![BorrowRequestStatus.Approved, BorrowRequestStatus.ReturnPending].includes(request.status)) {
        throw new BadRequestException(`Không thể trả yêu cầu ở trạng thái ${request.status}`);
      }
      if (!request.device_id) throw new BadRequestException('Yêu cầu chưa được cấp thiết bị cụ thể');
      const device = await manager.findOne(Device, {
        where: { id: request.device_id, is_deleted: false }, lock: { mode: 'pessimistic_write' },
      });
      if (!device) throw new NotFoundException('Thiết bị không tồn tại');
      if (![DeviceStatus.Borrowed, DeviceStatus.Maintenance, DeviceStatus.Available].includes(device.status)) {
        throw new BadRequestException('Trạng thái thiết bị không cho phép xác nhận trả');
      }

      const issued: IssuedAccessory[] = request.issued_accessories ?? [];
      const received = dto?.accessories ?? [];
      if (issued.length !== received.length || new Set(received.map(item => item.accessory_id)).size !== received.length) {
        throw new BadRequestException('Cần kiểm kê đầy đủ phụ kiện đã bàn giao');
      }
      const receivedById = new Map(received.map(item => [item.accessory_id, item.quantity]));
      for (const item of issued) {
        const quantity = receivedById.get(item.accessory_id);
        if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
          throw new BadRequestException(`Số lượng nhận lại của ${item.name} không hợp lệ`);
        }
      }
      const missing = issued.filter(item => receivedById.get(item.accessory_id)! < item.quantity);
      const surplus = issued.filter(item => receivedById.get(item.accessory_id)! > item.quantity);
      const missingDescription = missing.length
        ? `Thiếu phụ kiện khi trả: ${missing.map(item => `${item.name} (${item.quantity - receivedById.get(item.accessory_id)!})`).join(', ')}`
        : null;
      const surplusDescription = surplus.length
        ? `Thừa phụ kiện khi trả: ${surplus.map(item => `${item.name} (+${receivedById.get(item.accessory_id)! - item.quantity})`).join(', ')}`
        : null;
      request.returned_accessories = issued.map(item => ({
        ...item, quantity: receivedById.get(item.accessory_id)!,
      }));
      for (const item of [...issued].sort((a, b) => a.accessory_id.localeCompare(b.accessory_id))) {
        const stock = await manager.findOne(AccessoryStock, {
          where: { id: item.accessory_id, is_deleted: false },
          lock: { mode: 'pessimistic_write' },
        });
        if (!stock) throw new BadRequestException(`Phụ kiện ${item.name} không còn trong kho`);
        const receivedQuantity = receivedById.get(item.accessory_id)!;
        stock.available_quantity += receivedQuantity;
        stock.total_quantity += receivedQuantity - item.quantity;
        if (stock.total_quantity < 0 || stock.available_quantity < 0
          || stock.available_quantity > stock.total_quantity) {
          throw new BadRequestException(`Tồn kho ${item.name} không hợp lệ`);
        }
        await manager.save(AccessoryStock, stock);
      }

      const activeMaintenance = await manager.findOne(MaintenanceRecord, {
        where: {
          device_id: device.id,
          status: In([MaintenanceStatus.Pending, MaintenanceStatus.InProgress]),
        },
        order: { created_at: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      const shouldStartReportedIssue = activeMaintenance?.status === MaintenanceStatus.Pending
        && request.status === BorrowRequestStatus.ReturnPending
        && activeMaintenance.reported_by === request.users_id;
      const shouldStartMaintenance = shouldStartReportedIssue;
      const needsMaintenance = activeMaintenance?.status === MaintenanceStatus.InProgress
        || shouldStartMaintenance;
      if (needsMaintenance) {
        device.status = DeviceStatus.Maintenance;
        if (activeMaintenance && (activeMaintenance.status === MaintenanceStatus.InProgress || shouldStartMaintenance)) {
          if (shouldStartMaintenance) {
            activeMaintenance.status = MaintenanceStatus.InProgress;
            activeMaintenance.start_date = new Date();
          }
          await manager.save(activeMaintenance);
        }
      } else {
        device.status = DeviceStatus.Available;
      }
      request.status = BorrowRequestStatus.Returned;
      request.return_date = new Date();
      request.return_notes = [dto?.notes?.trim(), missingDescription, surplusDescription].filter(Boolean).join('\n') || null;
      await manager.save(device);
      const savedRequest = await manager.save(request);
      await this.notificationsService.create({
        user_id: request.users_id,
        title: 'Đã xác nhận trả thiết bị',
        message: needsMaintenance
          ? `Quản trị viên đã tiếp nhận thiết bị ${device.code} và chuyển sang bảo trì.`
          : `Quản trị viên đã xác nhận nhận lại thiết bị ${device.code}.`,
        type: NotificationType.BorrowRequestReturned,
        payload: { borrowRequestId: request.id, deviceId: device.id, link: '/my-requests' },
      }, manager);
      return savedRequest;
    });
  }

  async cancel(id: string, currentUser: CurrentUser) {
    return this.inTransaction(async manager => {
      const request = await this.findOneForUpdate(manager, id);
      if (currentUser.role !== UserRole.Admin && request.users_id !== currentUser.userId) {
        throw new ForbiddenException('Bạn không có quyền hủy yêu cầu mượn này');
      }
      this.requireStatus(request, BorrowRequestStatus.Pending, 'hủy');
      request.status = BorrowRequestStatus.Cancelled;
      const savedRequest = await manager.save(request);
      if (currentUser.role !== UserRole.Admin) {
        const requester = await manager.findOne(User, { where: { id: currentUser.userId } });
        await this.notificationsService.notifyAdmins({
          title: 'Yêu cầu mượn đã bị hủy',
          message: `${requester?.name || 'Một nhân viên'} đã hủy yêu cầu mượn đang chờ duyệt.`,
          type: NotificationType.BorrowRequestCancelled,
          payload: { borrowRequestId: request.id, link: '/borrow-requests' },
        }, manager);
      }
      return savedRequest;
    });
  }

  private async findOneForUpdate(manager: EntityManager, id: string) {
    const request = await manager.findOne(BorrowRequest, {
      where: { id }, lock: { mode: 'pessimistic_write' },
    });
    if (!request) throw new NotFoundException('Yêu cầu mượn không tồn tại');
    return request;
  }

  private requireStatus(request: BorrowRequest, status: BorrowRequestStatus, action: string) {
    if (request.status !== status) {
      throw new BadRequestException(`Không thể ${action} yêu cầu ở trạng thái ${request.status}`);
    }
  }

  private async inTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const result = await work(runner.manager);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
