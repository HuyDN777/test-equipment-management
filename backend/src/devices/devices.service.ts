import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, IsNull, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { CreateDeviceDto } from './dto/create-device.dto';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
import { Device, DeviceStatus } from './entities/device.entity';
import { BorrowRequest, BorrowRequestStatus } from '../borrow-requests/entities/borrow-request.entity';
import { MaintenanceRecord, MaintenanceStatus } from '../maintenance/entities/maintenance.entity';
import { DeviceModel } from './entities/device-model.entity';
import { AccessoryStock } from './entities/accessory-stock.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { ReplenishAccessoryStockDto } from './dto/replenish-accessory-stock.dto';
import { BulkUpdateDeviceLocationDto } from './dto/bulk-update-device-location.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(DeviceModel)
    private deviceModelRepository: Repository<DeviceModel>,
    @InjectRepository(AccessoryStock)
    private accessoryStockRepository: Repository<AccessoryStock>,
    private dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateDeviceDto) {
    return this.dataSource.transaction(async manager => {
      if (await manager.findOne(Device, { where: { code: createDto.code } })) {
        throw new ConflictException('Mã thiết bị đã tồn tại');
      }
      if (createDto.serial_number && await manager.findOne(Device, { where: { serial_number: createDto.serial_number } })) {
        throw new ConflictException('Serial number đã tồn tại');
      }

      const deviceModel = await this.resolveModel(manager, createDto);

      const device = await manager.save(Device, manager.create(Device, {
        ...createDto, device_model_id: deviceModel.id,
      }));
      return device;
    });
  }

  async createStock(dto: CreateStockDto) {
    const accessoryStocks = this.normalizeStockAccessories(dto.accessory_stocks);
    return this.dataSource.transaction(async manager => {
      let model: DeviceModel;
      if (dto.device_model_id) {
        const selected = await manager.findOne(DeviceModel, {
          where: { id: dto.device_model_id, is_deleted: false },
          lock: { mode: 'pessimistic_write' },
        });
        if (!selected) throw new NotFoundException('Model thiết bị không tồn tại');
        model = selected;
        if (dto.image_url && model.image_url !== dto.image_url) {
          model.image_url = dto.image_url;
          model = await manager.save(DeviceModel, model);
        }
      } else {
        model = await this.resolveModel(manager, dto);
      }
      const units = Array.from({ length: dto.quantity }, () => manager.create(Device, {
        device_model_id: model.id,
        device_categories_id: model.device_categories_id,
        code: randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase(),
        name: model.name,
        brand: model.brand,
        model: model.model,
        status: DeviceStatus.Available,
        location: dto.location,
      }));
      const savedUnits = await manager.save(Device, units, { chunk: 100 });
      await this.addAccessoryStock(manager, model.id, accessoryStocks);
      const [totalCount, availableCount] = await Promise.all([
        manager.count(Device, { where: { device_model_id: model.id, is_deleted: false } }),
        manager.count(Device, { where: { device_model_id: model.id, status: DeviceStatus.Available, is_deleted: false } }),
      ]);
      return { device_model_id: model.id, added_count: savedUnits.length, total_count: totalCount, available_count: availableCount };
    });
  }

  private async resolveModel(manager: EntityManager, dto: CreateStockDto | CreateDeviceDto) {
    let model = await manager.findOne(DeviceModel, {
      where: {
        device_categories_id: dto.device_categories_id,
        name: dto.name,
        brand: dto.brand ?? IsNull(),
        model: dto.model ?? IsNull(),
        is_deleted: false,
      },
    });
    if (!model) {
      model = await manager.save(DeviceModel, manager.create(DeviceModel, {
        device_categories_id: dto.device_categories_id,
        name: dto.name,
        brand: dto.brand,
        model: dto.model,
        specifications: dto.specifications,
        image_url: dto.image_url,
      }));
    } else if (dto.image_url && model.image_url !== dto.image_url) {
      model.image_url = dto.image_url;
      model = await manager.save(DeviceModel, model);
    }
    return model;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, category_id?: string, status?: DeviceStatus) {
    const queryBuilder = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.category', 'category')
      .leftJoinAndSelect('device.deviceModel', 'deviceModel')
      .where('device.is_deleted = :isDeleted', { isDeleted: false });

    if (search) {
      queryBuilder.andWhere(
        '(device.name LIKE :search OR device.brand LIKE :search OR device.code LIKE :search OR device.serial_number LIKE :search)',
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

  async getStockSummary() {
    const where = { is_deleted: false };
    const [total, available, borrowed, maintenance] = await Promise.all([
      this.deviceRepository.count({ where }),
      this.deviceRepository.count({ where: { ...where, status: DeviceStatus.Available } }),
      this.deviceRepository.count({ where: { ...where, status: DeviceStatus.Borrowed } }),
      this.deviceRepository.count({ where: { ...where, status: DeviceStatus.Maintenance } }),
    ]);
    return { total, available, borrowed, maintenance };
  }

  async findAccessoryStocks(modelId?: string) {
    const query = this.accessoryStockRepository.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.compatibleModels', 'compatibleModel')
      .where('stock.is_deleted = false')
      .orderBy('stock.name', 'ASC');
    if (modelId) {
      query.andWhere('compatibleModel.id = :modelId', { modelId });
    }
    return query.getMany();
  }

  async replenishAccessoryStock(dto: ReplenishAccessoryStockDto) {
    const [item] = this.normalizeStockAccessories([{ name: dto.name, quantity: dto.quantity }]);
    return this.dataSource.transaction(async manager => {
      const model = await manager.findOne(DeviceModel, {
        where: { id: dto.device_model_id, is_deleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!model) throw new NotFoundException('Model thiết bị không tồn tại');
      await this.addAccessoryStock(manager, model.id, [item]);
      return manager.createQueryBuilder(AccessoryStock, 'stock')
        .innerJoinAndSelect('stock.compatibleModels', 'compatibleModel')
        .where('LOWER(stock.name) = LOWER(:name)', { name: item.name })
        .andWhere('stock.is_deleted = false')
        .getOne();
    });
  }

  async findModels(page = 1, limit = 12, search?: string, categoryId?: string, availability?: DeviceStatus) {
    const query = this.deviceModelRepository.createQueryBuilder('model')
      .leftJoinAndSelect('model.category', 'category')
      .where('model.is_deleted = false')
      .orderBy('model.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search) {
      query.andWhere(`(model.name LIKE :search OR model.brand LIKE :search OR model.model LIKE :search
        OR EXISTS (SELECT 1 FROM devices asset WHERE asset.device_model_id = model.id
          AND asset.is_deleted = false AND (asset.code LIKE :search OR asset.serial_number LIKE :search)))`, {
        search: `%${search}%`,
      });
    }
    if (categoryId) query.andWhere('model.device_categories_id = :categoryId', { categoryId });
    if (availability === DeviceStatus.Available) {
      query.andWhere((qb) => `EXISTS ${qb.subQuery()
        .select('1').from(Device, 'availableAsset')
        .where('availableAsset.device_model_id = model.id')
        .andWhere('availableAsset.is_deleted = false')
        .andWhere('availableAsset.status = :catalogStatus')
        .getQuery()}`, { catalogStatus: DeviceStatus.Available });
    } else if (availability === DeviceStatus.Borrowed) {
      query.andWhere((qb) => `NOT EXISTS ${qb.subQuery()
        .select('1').from(Device, 'availableAsset')
        .where('availableAsset.device_model_id = model.id')
        .andWhere('availableAsset.is_deleted = false')
        .andWhere('availableAsset.status = :catalogStatus')
        .getQuery()}`, { catalogStatus: DeviceStatus.Available });
    }
    const [models, total] = await query.getManyAndCount();
    const data = await Promise.all(models.map(async (model) => {
      const imageAsset = model.image_url ? null : await this.deviceRepository.createQueryBuilder('asset')
        .select(['asset.id', 'asset.image_url'])
        .where('asset.device_model_id = :modelId', { modelId: model.id })
        .andWhere('asset.is_deleted = false')
        .andWhere('asset.image_url IS NOT NULL')
        .orderBy('asset.created_at', 'ASC')
        .getOne();
      return {
        ...model,
        image_url: model.image_url || imageAsset?.image_url || null,
        total_count: await this.deviceRepository.count({
          where: { device_model_id: model.id, is_deleted: false },
        }),
        available_count: await this.deviceRepository.count({
          where: { device_model_id: model.id, status: DeviceStatus.Available, is_deleted: false },
        }),
      };
    }));
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findModel(id: string) {
    const model = await this.deviceModelRepository.findOne({
      where: { id, is_deleted: false },
      relations: { category: true },
    });
    if (!model) throw new NotFoundException('Không tìm thấy model thiết bị');
    const [totalCount, availableCount, imageAsset, accessoryOptions, availableLocations] = await Promise.all([
      this.deviceRepository.count({ where: { device_model_id: id, is_deleted: false } }),
      this.deviceRepository.count({ where: { device_model_id: id, status: DeviceStatus.Available, is_deleted: false } }),
      model.image_url ? Promise.resolve(null) : this.deviceRepository.createQueryBuilder('asset')
        .select(['asset.id', 'asset.image_url'])
        .where('asset.device_model_id = :modelId', { modelId: id })
        .andWhere('asset.is_deleted = false')
        .andWhere('asset.image_url IS NOT NULL')
        .orderBy('asset.created_at', 'ASC')
        .getOne(),
      this.accessoryStockRepository.createQueryBuilder('accessory')
        .innerJoin('accessory.compatibleModels', 'compatibleModel', 'compatibleModel.id = :modelId', { modelId: id })
        .select(['accessory.id', 'accessory.name', 'accessory.available_quantity'])
        .where('accessory.is_deleted = false')
        .andWhere('accessory.available_quantity > 0')
        .orderBy('accessory.name', 'ASC')
        .getMany(),
      this.deviceRepository.createQueryBuilder('asset')
        .select('asset.location', 'location')
        .addSelect('COUNT(asset.id)', 'count')
        .where('asset.device_model_id = :modelId', { modelId: id })
        .andWhere('asset.is_deleted = false')
        .andWhere('asset.status = :status', { status: DeviceStatus.Available })
        .andWhere('asset.location IS NOT NULL')
        .andWhere("TRIM(asset.location) <> ''")
        .groupBy('asset.location')
        .orderBy('asset.location', 'ASC')
        .getRawMany<{ location: string; count: string }>(),
    ]);
    return {
      ...model,
      image_url: model.image_url || imageAsset?.image_url || null,
      total_count: totalCount,
      available_count: availableCount,
      available_locations: availableLocations.map(item => ({ location: item.location, count: Number(item.count) })),
      accessory_options: accessoryOptions.map(item => ({
        id: item.id,
        name: item.name,
        available_quantity: item.available_quantity,
        max_quantity: item.available_quantity,
      })),
    };
  }

  async findAvailableAssets(modelId: string, search?: string) {
    const query = this.deviceRepository.createQueryBuilder('asset')
      .where('asset.device_model_id = :modelId', { modelId })
      .andWhere('asset.is_deleted = false')
      .andWhere('asset.status = :status', { status: DeviceStatus.Available })
      .orderBy('asset.created_at', 'ASC')
      .take(50);
    if (search?.trim()) {
      query.andWhere('(asset.code LIKE :search OR asset.serial_number LIKE :search)', { search: `%${search.trim()}%` });
    }
    return query.getMany();
  }

  async findModelAssets(modelId: string, page = 1, limit = 10, search?: string) {
    const model = await this.deviceModelRepository.findOne({ where: { id: modelId, is_deleted: false } });
    if (!model) throw new NotFoundException('Model thiết bị không tồn tại');
    const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
    const safeLimit = Math.min(100, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 10));
    const query = this.deviceRepository.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.deviceModel', 'deviceModel')
      .where('asset.device_model_id = :modelId', { modelId })
      .andWhere('asset.is_deleted = false');
    if (search?.trim()) query.andWhere('(asset.code LIKE :search OR asset.serial_number LIKE :search)', { search: `%${search.trim()}%` });
    const [data, total] = await query.orderBy('asset.created_at', 'ASC')
      .skip((safePage - 1) * safeLimit).take(safeLimit).getManyAndCount();
    return { data, total, page: safePage, limit: safeLimit };
  }

  async findOne(id: string) {
    const device = await this.deviceRepository.findOne({
      where: { id, is_deleted: false },
      relations: { category: true, deviceModel: true }
    });
    
    if (!device) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }
    return device;
  }

  async update(id: string, updateDto: UpdateDeviceDto) {
    return this.dataSource.transaction(async manager => {
      const device = await manager.findOne(Device, {
        where: { id, is_deleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device) throw new NotFoundException('Không tìm thấy thiết bị');
      const activeBorrow = updateDto.status !== undefined ? await manager.findOne(BorrowRequest, {
        where: { device_id: id, status: In([BorrowRequestStatus.Approved, BorrowRequestStatus.ReturnPending]) },
      }) : null;
      if (activeBorrow && updateDto.status && updateDto.status !== device.status) {
        throw new BadRequestException('Không thể đổi trạng thái thiết bị khi đang có lượt mượn chưa kết thúc');
      }
      if (updateDto.status && updateDto.status !== device.status) {
        throw new BadRequestException('Trạng thái thiết bị được quản lý qua phiếu mượn, bảo trì và hiệu chuẩn');
      }
      if (updateDto.code && updateDto.code !== device.code && await manager.findOne(Device, { where: { code: updateDto.code } })) {
        throw new ConflictException('Mã thiết bị đã tồn tại');
      }
      if (updateDto.serial_number && updateDto.serial_number !== device.serial_number
        && await manager.findOne(Device, { where: { serial_number: updateDto.serial_number } })) {
        throw new ConflictException('Serial number đã tồn tại');
      }
      Object.assign(device, updateDto);
      const savedDevice = await manager.save(Device, device);
      if (updateDto.image_url) {
        const model = await manager.findOne(DeviceModel, { where: { id: device.device_model_id } });
        if (model && model.image_url !== updateDto.image_url) {
          model.image_url = updateDto.image_url;
          await manager.save(DeviceModel, model);
        }
      }
      return savedDevice;
    });
  }

  async bulkUpdateLocation(dto: BulkUpdateDeviceLocationDto) {
    const ids = [...new Set(dto.device_ids)];
    const location = dto.location.trim();
    if (!ids.length || ids.length > 100 || ids.length !== dto.device_ids.length || !location) {
      throw new BadRequestException('Danh sách thiết bị hoặc vị trí không hợp lệ');
    }
    return this.dataSource.transaction(async manager => {
      const assets = await manager.createQueryBuilder(Device, 'asset')
        .where('asset.id IN (:...ids)', { ids })
        .orderBy('asset.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      if (assets.length !== ids.length || assets.some(asset => asset.is_deleted
        || asset.device_model_id !== dto.device_model_id || asset.status !== DeviceStatus.Available)) {
        throw new BadRequestException('Chỉ cập nhật cùng lúc các máy còn sẵn thuộc cùng một model');
      }
      await manager.update(Device, { id: In(ids) }, { location });
      return { updated_count: ids.length, location };
    });
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

      activeBorrow.status = BorrowRequestStatus.ReturnPending;
      await queryRunner.manager.save(activeBorrow);

      const maintenanceRecord = queryRunner.manager.create(MaintenanceRecord, {
        device_id: deviceId,
        reported_by: userId,
        issue: reportIssueDto.issue,
        notes: reportIssueDto.notes,
        status: MaintenanceStatus.Pending,
        start_date: null,
      });
      const savedRecord = await queryRunner.manager.save(maintenanceRecord);

      const reporter = await queryRunner.manager.findOne(User, { where: { id: userId } });
      await this.notificationsService.notifyAdmins({
        title: 'Nhân viên báo lỗi thiết bị',
        message: `${reporter?.name || 'Một nhân viên'} báo lỗi ${device.code}: ${reportIssueDto.issue}`,
        type: NotificationType.DeviceIssueReported,
        payload: {
          borrowRequestId: activeBorrow.id,
          deviceId: device.id,
          maintenanceRecordId: savedRecord.id,
          link: '/borrow-requests',
        },
      }, queryRunner.manager);

      await queryRunner.commitTransaction();

      return {
        message: 'Báo lỗi thành công. Vui lòng bàn giao thiết bị để quản trị viên xác nhận tiếp nhận.',
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

  private normalizeStockAccessories(items: CreateStockDto['accessory_stocks']) {
    const normalized = (items ?? []).map(item => ({
      name: item.name.trim(),
      quantity: Number(item.quantity),
    }));
    if (new Set(normalized.map(item => item.name.toLocaleLowerCase())).size !== normalized.length) {
      throw new BadRequestException('Tên phụ kiện nhập kho không được trùng nhau');
    }
    for (const item of normalized) {
      if (!item.name) throw new BadRequestException('Tên phụ kiện không được để trống');
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000) {
        throw new BadRequestException(`Số lượng nhập kho của ${item.name} phải là số nguyên từ 1 đến 100000`);
      }
    }
    return normalized;
  }

  private async addAccessoryStock(
    manager: EntityManager,
    modelId: string,
    items: { name: string; quantity: number }[],
  ) {
    for (const item of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
      let stock = await manager.createQueryBuilder(AccessoryStock, 'stock')
        .where('LOWER(stock.name) = LOWER(:name)', { name: item.name })
        .andWhere('stock.is_deleted = false')
        .setLock('pessimistic_write')
        .getOne();
      if (!stock) {
        stock = manager.create(AccessoryStock, {
          name: item.name,
          total_quantity: item.quantity,
          available_quantity: item.quantity,
          is_deleted: false,
        });
      } else {
        stock.total_quantity += item.quantity;
        stock.available_quantity += item.quantity;
      }
      stock = await manager.save(AccessoryStock, stock);
      const compatibleModels = await manager.createQueryBuilder()
        .relation(AccessoryStock, 'compatibleModels')
        .of(stock.id)
        .loadMany<DeviceModel>();
      if (!compatibleModels.some(model => model.id === modelId)) {
        await manager.createQueryBuilder()
          .relation(AccessoryStock, 'compatibleModels')
          .of(stock.id)
          .add(modelId);
      }
    }
  }
}
