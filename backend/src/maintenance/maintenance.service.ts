import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { MaintenanceRecord, MaintenanceStatus } from './entities/maintenance.entity';
import { CalibrationRecord, CalibrationResult, CalibrationStatus } from './entities/calibration-record.entity';
import { Device, DeviceStatus } from '../devices/entities/device.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { UpdateCalibrationDto } from './dto/update-calibration.dto';
import { CalibrationReminderService } from '../notifications/calibration-reminder.service';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepository: Repository<MaintenanceRecord>,
    @InjectRepository(CalibrationRecord)
    private readonly calibrationRepository: Repository<CalibrationRecord>,
    private readonly dataSource: DataSource,
    private readonly calibrationReminderService: CalibrationReminderService,
  ) {}

  private today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private date(value?: string): Date {
    if (!value) return this.today();
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private dayKey(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private ensureNotPast(value: string | undefined, field: string): void {
    if (value && this.dayKey(this.date(value)) < this.dayKey(this.today())) {
      throw new BadRequestException(`${field} không được ở trong quá khứ`);
    }
  }

  private async lockDevice(manager: EntityManager, deviceId: string): Promise<Device> {
    const device = await manager.findOne(Device, {
      where: { id: deviceId, is_deleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    if (!device) throw new NotFoundException('Không tìm thấy thiết bị');
    return device;
  }

  private async checkVendor(manager: EntityManager, vendorId?: string): Promise<void> {
    if (!vendorId) return;
    const vendor = await manager.findOne(Vendor, { where: { id: vendorId, is_deleted: false } });
    if (!vendor) throw new BadRequestException('Đối tác không tồn tại hoặc đã bị xóa');
  }

  private async ensureNoOtherWork(manager: EntityManager, deviceId: string, type: 'maintenance' | 'calibration', id: string) {
    const otherMaintenance = await manager.findOne(MaintenanceRecord, {
      where: { device_id: deviceId, status: MaintenanceStatus.InProgress, ...(type === 'maintenance' ? { id: Not(id) } : {}) },
    });
    const otherCalibration = await manager.findOne(CalibrationRecord, {
      where: { device_id: deviceId, status: CalibrationStatus.InProgress, ...(type === 'calibration' ? { id: Not(id) } : {}) },
    });
    if (otherMaintenance || otherCalibration) {
      throw new BadRequestException('Thiết bị đang có một công việc bảo trì/hiệu chuẩn khác');
    }
  }

  private async releaseDeviceIfSafe(manager: EntityManager, device: Device): Promise<void> {
    const openMaintenance = await manager.findOne(MaintenanceRecord, {
      where: { device_id: device.id, status: MaintenanceStatus.InProgress },
    });
    const openCalibration = await manager.findOne(CalibrationRecord, {
      where: { device_id: device.id, status: CalibrationStatus.InProgress },
    });
    const latestCalibration = await manager.findOne(CalibrationRecord, {
      where: { device_id: device.id, status: CalibrationStatus.Completed },
      order: { calibration_date: 'DESC', created_at: 'DESC' },
    });
    device.status = openMaintenance || openCalibration || (latestCalibration && latestCalibration.result !== CalibrationResult.Pass)
      ? DeviceStatus.Maintenance
      : DeviceStatus.Available;
    await manager.save(Device, device);
  }

  async createMaintenance(reporterId: string, dto: CreateMaintenanceDto) {
    this.ensureNotPast(dto.planned_date, 'Ngày bảo trì dự kiến');
    return this.dataSource.transaction(async manager => {
      await this.lockDevice(manager, dto.device_id);
      await this.checkVendor(manager, dto.vendors_id);
      const openRecord = await manager.findOne(MaintenanceRecord, {
        where: { device_id: dto.device_id, status: In([MaintenanceStatus.Pending, MaintenanceStatus.InProgress]) },
      });
      if (openRecord) throw new BadRequestException('Thiết bị đã có phiếu bảo trì chưa hoàn tất');
      return manager.save(MaintenanceRecord, manager.create(MaintenanceRecord, {
        device_id: dto.device_id,
        reported_by: reporterId,
        vendors_id: dto.vendors_id ?? null,
        issue: dto.issue.trim(),
        planned_date: dto.planned_date ? this.date(dto.planned_date) : null,
        start_date: null,
        end_date: null,
        cost: dto.cost,
        notes: dto.notes,
        status: MaintenanceStatus.Pending,
      }));
    });
  }

  async updateMaintenance(id: string, dto: UpdateMaintenanceDto) {
    return this.dataSource.transaction(async manager => {
      const existing = await manager.findOne(MaintenanceRecord, { where: { id } });
      if (!existing) throw new NotFoundException('Không tìm thấy phiếu bảo trì');
      const device = await this.lockDevice(manager, existing.device_id);
      const record = await manager.findOne(MaintenanceRecord, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!record) throw new NotFoundException('Không tìm thấy phiếu bảo trì');

      if (dto.vendors_id !== undefined) {
        await this.checkVendor(manager, dto.vendors_id);
        record.vendors_id = dto.vendors_id;
      }
      if (dto.cost !== undefined) record.cost = dto.cost;
      if (dto.notes !== undefined) record.notes = dto.notes;

      let completedNow = false;
      if (dto.status && dto.status !== record.status) {
        if (record.status === MaintenanceStatus.Pending && dto.status === MaintenanceStatus.InProgress) {
          if (device.status === DeviceStatus.Borrowed) {
            throw new BadRequestException('Thiết bị đang được mượn; cần nhận lại trước khi gửi bảo trì');
          }
          await this.ensureNoOtherWork(manager, device.id, 'maintenance', id);
          record.start_date = this.date(dto.start_date);
          record.status = MaintenanceStatus.InProgress;
          device.status = DeviceStatus.Maintenance;
          await manager.save(Device, device);
        } else if (record.status === MaintenanceStatus.InProgress && dto.status === MaintenanceStatus.Completed) {
          record.end_date = this.date(dto.end_date);
          if (record.start_date && this.dayKey(record.end_date) < this.dayKey(record.start_date)) {
            throw new BadRequestException('Ngày hoàn tất không được trước ngày bắt đầu');
          }
          record.status = MaintenanceStatus.Completed;
          completedNow = true;
        } else {
          throw new BadRequestException('Chuyển trạng thái phiếu bảo trì không hợp lệ');
        }
      } else if (dto.start_date || dto.end_date) {
        throw new BadRequestException('Chỉ nhập ngày thực tế khi chuyển trạng thái phiếu');
      }

      const saved = await manager.save(MaintenanceRecord, record);
      if (completedNow) {
        await this.releaseDeviceIfSafe(manager, device);
      }
      return saved;
    });
  }

  async findAllMaintenance(page = 1, limit = 10) {
    const [items, total] = await this.maintenanceRepository.findAndCount({
      relations: { device: true, reporter: true, vendor: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createCalibration(dto: CreateCalibrationDto) {
    this.ensureNotPast(dto.planned_date, 'Ngày hiệu chuẩn dự kiến');
    return this.dataSource.transaction(async manager => {
      await this.lockDevice(manager, dto.device_id);
      if (!dto.vendors_id) throw new BadRequestException('Cần chọn đối tác hiệu chuẩn');
      await this.checkVendor(manager, dto.vendors_id);
      const openRepair = await manager.findOne(MaintenanceRecord, {
        where: { device_id: dto.device_id, status: In([MaintenanceStatus.Pending, MaintenanceStatus.InProgress]) },
      });
      if (openRepair) throw new BadRequestException('Cần hoàn tất phiếu bảo trì trước khi tạo phiếu hiệu chuẩn');
      const openRecord = await manager.findOne(CalibrationRecord, {
        where: { device_id: dto.device_id, status: In([CalibrationStatus.Pending, CalibrationStatus.InProgress]) },
      });
      if (openRecord) throw new BadRequestException('Thiết bị đã có phiếu hiệu chuẩn chưa hoàn tất');
      return manager.save(CalibrationRecord, manager.create(CalibrationRecord, {
        device_id: dto.device_id,
        vendors_id: dto.vendors_id,
        calibration_type: dto.calibration_type.trim(),
        planned_date: dto.planned_date ? this.date(dto.planned_date) : null,
        start_date: null,
        calibration_date: null,
        next_due_date: null,
        result: null,
        notes: dto.notes,
        status: CalibrationStatus.Pending,
      }));
    });
  }

  async updateCalibration(id: string, dto: UpdateCalibrationDto) {
    const completed = await this.dataSource.transaction(async manager => {
      const existing = await manager.findOne(CalibrationRecord, { where: { id } });
      if (!existing) throw new NotFoundException('Không tìm thấy phiếu hiệu chuẩn');
      const device = await this.lockDevice(manager, existing.device_id);
      const record = await manager.findOne(CalibrationRecord, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!record) throw new NotFoundException('Không tìm thấy phiếu hiệu chuẩn');

      if (record.status === CalibrationStatus.Pending && dto.status === CalibrationStatus.InProgress) {
        if (device.status === DeviceStatus.Borrowed) {
          throw new BadRequestException('Thiết bị đang được mượn; cần nhận lại trước khi hiệu chuẩn');
        }
        await this.ensureNoOtherWork(manager, device.id, 'calibration', id);
        record.start_date = this.date(dto.start_date);
        record.status = CalibrationStatus.InProgress;
        device.status = DeviceStatus.Maintenance;
        await manager.save(Device, device);
      } else if (record.status === CalibrationStatus.InProgress && dto.status === CalibrationStatus.Completed) {
        if (!dto.calibration_date || !dto.result) {
          throw new BadRequestException('Cần nhập ngày thực hiện và kết quả hiệu chuẩn');
        }
        const actualDate = this.date(dto.calibration_date);
        if (record.start_date && this.dayKey(actualDate) < this.dayKey(record.start_date)) {
          throw new BadRequestException('Ngày thực hiện không được trước ngày bắt đầu');
        }
        if (dto.result === CalibrationResult.Pass) {
          if (!dto.next_due_date) throw new BadRequestException('Thiết bị đạt cần có hạn hiệu chuẩn tiếp theo');
          const nextDate = this.date(dto.next_due_date);
          this.ensureNotPast(dto.next_due_date, 'Hạn hiệu chuẩn tiếp theo');
          if (nextDate <= actualDate) throw new BadRequestException('Hạn hiệu chuẩn tiếp theo phải sau ngày thực hiện');
          const openRepair = await manager.findOne(MaintenanceRecord, {
            where: { device_id: device.id, status: In([MaintenanceStatus.Pending, MaintenanceStatus.InProgress]) },
          });
          if (openRepair) throw new BadRequestException('Cần hoàn tất phiếu bảo trì trước khi xác nhận hiệu chuẩn đạt');
          record.next_due_date = nextDate;
        } else {
          if (dto.next_due_date) throw new BadRequestException('Hiệu chuẩn không đạt thì chưa có hạn tiếp theo');
          record.next_due_date = null;
        }
        record.calibration_date = actualDate;
        record.result = dto.result;
        record.status = CalibrationStatus.Completed;
      } else {
        throw new BadRequestException('Chuyển trạng thái phiếu hiệu chuẩn không hợp lệ');
      }

      if (dto.notes !== undefined) record.notes = dto.notes;
      const saved = await manager.save(CalibrationRecord, record);
      if (record.status === CalibrationStatus.Completed) {
        if (record.result === CalibrationResult.Fail) {
          device.status = DeviceStatus.Maintenance;
          await manager.save(Device, device);
          await manager.save(MaintenanceRecord, manager.create(MaintenanceRecord, {
            device_id: device.id,
            issue: `Hiệu chuẩn không đạt: ${record.calibration_type}`,
            status: MaintenanceStatus.Pending,
            start_date: null,
            end_date: null,
            planned_date: null,
            vendors_id: record.vendors_id,
            notes: `Tạo tự động từ phiếu hiệu chuẩn ${record.id}`,
          }));
        } else {
          await this.releaseDeviceIfSafe(manager, device);
        }
      }
      return saved;
    });
    if (completed.status === CalibrationStatus.Completed && completed.result === CalibrationResult.Pass) {
      try {
        await this.calibrationReminderService.scanDueReminders();
      } catch (error) {
        this.logger.error('Không thể tạo thông báo hạn hiệu chuẩn', error instanceof Error ? error.stack : undefined);
      }
    }
    return completed;
  }

  async findAllCalibration(page = 1, limit = 10) {
    const [items, total] = await this.calibrationRepository.findAndCount({
      relations: { device: true, vendor: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneCalibration(id: string) {
    const record = await this.calibrationRepository.findOne({
      where: { id },
      relations: { device: true, vendor: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy phiếu hiệu chuẩn');
    return record;
  }
}
