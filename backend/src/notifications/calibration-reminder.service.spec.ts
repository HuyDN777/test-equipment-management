import { CalibrationReminderService } from './calibration-reminder.service';
import { CalibrationRecord } from '../maintenance/entities/calibration-record.entity';
import { ReportsService } from '../reports/reports.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';

describe('CalibrationReminderService', () => {
  const now = new Date('2026-09-21T03:00:00.000Z');
  const record = (dueDate: string, id = 'cal-1') => ({
    id,
    device_id: 'device-1',
    next_due_date: dueDate,
    device: { id: 'device-1', name: 'iPhone 15', code: 'PHONE-001' },
  }) as unknown as CalibrationRecord;

  function setup(records: CalibrationRecord[]) {
    const reports = { getCalibrationDueDevices: jest.fn().mockResolvedValue(records) } as unknown as ReportsService;
    const notifications = { notifyAdminsOnce: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
    return { service: new CalibrationReminderService(reports, notifications), reports, notifications };
  }

  it('nhắc admin ở mốc 30 ngày và dẫn vào đúng phiếu hiệu chuẩn', async () => {
    const { service, reports, notifications } = setup([record('2026-10-01')]);
    expect(await service.scanDueReminders(now)).toBe(1);
    expect(reports.getCalibrationDueDevices).toHaveBeenCalledWith(30, now, 30);
    expect(notifications.notifyAdminsOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CalibrationDue,
        payload: expect.objectContaining({ link: '/maintenance?tab=calibration&calibrationId=cal-1' }),
      }),
      'calibration-due:cal-1:30-day',
    );
  });

  it('mỗi mốc dùng một khóa chống trùng ổn định', async () => {
    const { service, notifications } = setup([record('2026-09-22')]);
    await service.scanDueReminders(now);
    await service.scanDueReminders(now);
    expect((notifications.notifyAdminsOnce as jest.Mock).mock.calls.map(call => call[1]))
      .toEqual(['calibration-due:cal-1:1-day', 'calibration-due:cal-1:1-day']);
  });

  it('bỏ qua dữ liệu không có hạn hoặc nằm ngoài cửa sổ nhắc', async () => {
    const { service, notifications } = setup([record('2026-12-01'), record('2026-08-01', 'cal-2'), record(null as any, 'cal-3')]);
    expect(await service.scanDueReminders(now)).toBe(0);
    expect(notifications.notifyAdminsOnce).not.toHaveBeenCalled();
  });

  it('gửi một mốc quá hạn với nội dung riêng', async () => {
    const { service, notifications } = setup([record('2026-09-20')]);
    await service.scanDueReminders(now);
    expect(notifications.notifyAdminsOnce).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Thiết bị đã quá hạn hiệu chuẩn' }),
      'calibration-due:cal-1:overdue',
    );
  });

  it.each([
    ['2026-09-28', '7-day'],
    ['2026-09-21', 'today'],
  ])('gửi đúng mốc %s', async (dueDate, bucket) => {
    const { service, notifications } = setup([record(dueDate)]);
    await service.scanDueReminders(now);
    expect(notifications.notifyAdminsOnce).toHaveBeenCalledWith(
      expect.any(Object), `calibration-due:cal-1:${bucket}`,
    );
  });
});
