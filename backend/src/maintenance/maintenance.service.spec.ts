import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceRecord, MaintenanceStatus } from './entities/maintenance.entity';
import { CalibrationRecord, CalibrationResult, CalibrationStatus } from './entities/calibration-record.entity';
import { Device, DeviceStatus } from '../devices/entities/device.entity';
import { Vendor } from '../vendors/entities/vendor.entity';

describe('MaintenanceService workflow', () => {
  const device = { id: 'device-1', status: DeviceStatus.Available } as Device;
  const vendor = { id: 'vendor-1', is_deleted: false } as Vendor;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-21T05:00:00.000Z'));
  });

  afterAll(() => jest.useRealTimers());

  function setup(findOne: jest.Mock) {
    const manager = {
      findOne,
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async (_entity, value) => value),
    };
    const dataSource = { transaction: jest.fn(async callback => callback(manager)) } as unknown as DataSource;
    const calibrationReminderService = { scanDueReminders: jest.fn().mockResolvedValue(0) };
    const service = new MaintenanceService({} as any, {} as any, dataSource, calibrationReminderService as any);
    return { service, manager, calibrationReminderService };
  }

  beforeEach(() => { device.status = DeviceStatus.Available; });

  it('tạo phiếu bảo trì ở trạng thái chờ, chưa khóa thiết bị', async () => {
    const { service, manager } = setup(jest.fn(async entity => entity === Device ? device : null));
    const record = await service.createMaintenance('admin-1', { device_id: device.id, issue: 'Màn hình lỗi' });
    expect(record.status).toBe(MaintenanceStatus.Pending);
    expect(record.start_date).toBeNull();
    expect(device.status).toBe(DeviceStatus.Available);
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('tạo phiếu hiệu chuẩn ở trạng thái chờ, chưa mặc định kết quả Đạt', async () => {
    const { service } = setup(jest.fn(async entity => entity === Device ? device : entity === Vendor ? vendor : null));
    const record = await service.createCalibration({ device_id: device.id, vendors_id: vendor.id, calibration_type: 'Định kỳ' });
    expect(record.status).toBe(CalibrationStatus.Pending);
    expect(record.result).toBeNull();
    expect(record.next_due_date).toBeNull();
    expect(device.status).toBe(DeviceStatus.Available);
  });

  it('chỉ khóa thiết bị khi bắt đầu phiếu bảo trì', async () => {
    const record = { id: 'repair-1', device_id: device.id, status: MaintenanceStatus.Pending, start_date: null } as MaintenanceRecord;
    const { service } = setup(jest.fn(async (entity, options) => {
      if (entity === Device) return device;
      if (entity === MaintenanceRecord && options.where.id === record.id) return record;
      return null;
    }));
    await service.updateMaintenance(record.id, { status: MaintenanceStatus.InProgress, start_date: '2026-09-20' });
    expect(record.status).toBe(MaintenanceStatus.InProgress);
    expect(device.status).toBe(DeviceStatus.Maintenance);
  });

  it('hiệu chuẩn không đạt giữ máy ở bảo trì và tạo phiếu xử lý', async () => {
    const record = {
      id: 'cal-1', device_id: device.id, vendors_id: vendor.id,
      calibration_type: 'Định kỳ', status: CalibrationStatus.InProgress,
      start_date: new Date('2026-09-20'),
    } as CalibrationRecord;
    const { service, manager } = setup(jest.fn(async (entity, options) => {
      if (entity === Device) return device;
      if (entity === CalibrationRecord && options.where.id === record.id) return record;
      return null;
    }));
    await service.updateCalibration(record.id, { status: CalibrationStatus.Completed, calibration_date: '2026-09-21', result: CalibrationResult.Fail });
    expect(device.status).toBe(DeviceStatus.Maintenance);
    expect(record.next_due_date).toBeNull();
    expect(manager.save).toHaveBeenCalledWith(MaintenanceRecord, expect.objectContaining({ status: MaintenanceStatus.Pending }));
  });

  it('không cho ghi hạn tiếp theo nếu hiệu chuẩn không đạt', async () => {
    const record = { id: 'cal-1', device_id: device.id, status: CalibrationStatus.InProgress, start_date: new Date('2026-09-20') } as CalibrationRecord;
    const { service } = setup(jest.fn(async entity => entity === Device ? device : record));
    await expect(service.updateCalibration(record.id, {
      status: CalibrationStatus.Completed, calibration_date: '2026-09-21',
      result: CalibrationResult.Fail, next_due_date: '2027-09-21',
    })).rejects.toThrow(BadRequestException);
  });

  it('hiệu chuẩn đạt sau xử lý cho phép mở lại máy', async () => {
    device.status = DeviceStatus.Maintenance;
    const record = { id: 'cal-2', device_id: device.id, status: CalibrationStatus.InProgress, start_date: new Date('2026-09-20') } as CalibrationRecord;
    const { service } = setup(jest.fn(async (entity, options) => {
      if (entity === Device) return device;
      if (entity === CalibrationRecord) {
        if (options.where.id === record.id || options.where.status === record.status) return record;
        return null;
      }
      return null;
    }));
    await service.updateCalibration(record.id, {
      status: CalibrationStatus.Completed, calibration_date: '2026-09-21',
      result: CalibrationResult.Pass, next_due_date: '2027-09-21',
    });
    expect(record.status).toBe(CalibrationStatus.Completed);
    expect(record.result).toBe(CalibrationResult.Pass);
    expect(device.status).toBe(DeviceStatus.Available);
  });

  it('quét thông báo ngay sau khi hoàn tất hiệu chuẩn đạt', async () => {
    const record = { id: 'cal-3', device_id: device.id, status: CalibrationStatus.InProgress, start_date: new Date('2026-09-20') } as CalibrationRecord;
    const { service, calibrationReminderService } = setup(jest.fn(async (entity, options) => {
      if (entity === Device) return device;
      if (entity === CalibrationRecord) {
        if (options.where.id === record.id || options.where.status === record.status) return record;
        return null;
      }
      return null;
    }));

    await service.updateCalibration(record.id, {
      status: CalibrationStatus.Completed,
      calibration_date: '2026-09-21',
      result: CalibrationResult.Pass,
      next_due_date: '2026-09-22',
    });

    expect(calibrationReminderService.scanDueReminders).toHaveBeenCalledTimes(1);
  });

  it('không cho tạo lịch dự kiến trong quá khứ', async () => {
    const { service } = setup(jest.fn());
    await expect(service.createCalibration({
      device_id: device.id,
      vendors_id: vendor.id,
      calibration_type: 'Định kỳ',
      planned_date: '2000-01-01',
    })).rejects.toThrow('Ngày hiệu chuẩn dự kiến không được ở trong quá khứ');
    await expect(service.createMaintenance('admin-1', {
      device_id: device.id,
      issue: 'Kiểm tra',
      planned_date: '2000-01-01',
    })).rejects.toThrow('Ngày bảo trì dự kiến không được ở trong quá khứ');
  });

  it('hoàn tất bảo trì không mở khóa máy nếu lần hiệu chuẩn mới nhất không đạt', async () => {
    device.status = DeviceStatus.Maintenance;
    const record = { id: 'repair-1', device_id: device.id, status: MaintenanceStatus.InProgress, start_date: new Date('2026-09-20') } as MaintenanceRecord;
    const failedCalibration = { result: CalibrationResult.Fail } as CalibrationRecord;
    const { service } = setup(jest.fn(async (entity, options) => {
      if (entity === Device) return device;
      if (entity === MaintenanceRecord) return options.where.id === record.id ? record : null;
      if (entity === CalibrationRecord) return failedCalibration;
      return null;
    }));
    await service.updateMaintenance(record.id, { status: MaintenanceStatus.Completed, end_date: '2026-09-21' });
    expect(record.status).toBe(MaintenanceStatus.Completed);
    expect(device.status).toBe(DeviceStatus.Maintenance);
  });
});
