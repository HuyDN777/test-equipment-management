import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { CalibrationStatus } from './entities/calibration-record.entity';

describe('MaintenanceController', () => {
  it('chuyển cập nhật hiệu chuẩn đến service', () => {
    const service = { updateCalibration: jest.fn() } as unknown as MaintenanceService;
    const controller = new MaintenanceController(service);
    controller.updateCalibration('cal-1', { status: CalibrationStatus.InProgress });
    expect(service.updateCalibration).toHaveBeenCalledWith('cal-1', { status: CalibrationStatus.InProgress });
  });
});
