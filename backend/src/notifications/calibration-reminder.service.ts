import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { calendarDate, daysBetweenDates } from '../common/calendar-date';
import { ReportsService } from '../reports/reports.service';
import { NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class CalibrationReminderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CalibrationReminderService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly reportsService: ReportsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.CALIBRATION_REMINDERS_ENABLED === 'false') return;
    void this.scanDueReminders().catch(error => this.logger.error('Không thể kiểm tra hạn hiệu chuẩn', error));
    this.timer = setInterval(() => {
      void this.scanDueReminders().catch(error => this.logger.error('Không thể kiểm tra hạn hiệu chuẩn', error));
    }, CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async scanDueReminders(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const today = calendarDate(now);
      const records = await this.reportsService.getCalibrationDueDevices(30, now, 30);
      let processed = 0;
      for (const record of records) {
        if (!record.next_due_date || !record.device) continue;
        const dueDate = record.next_due_date instanceof Date
          ? record.next_due_date.toISOString().slice(0, 10)
          : String(record.next_due_date).slice(0, 10);
        const daysLeft = daysBetweenDates(today, dueDate);
        if (!Number.isFinite(daysLeft) || daysLeft > 30 || daysLeft < -30) continue;

        const bucket = daysLeft < 0 ? 'overdue'
          : daysLeft === 0 ? 'today'
            : daysLeft <= 1 ? '1-day'
              : daysLeft <= 7 ? '7-day' : '30-day';
        const dueLabel = `${dueDate.slice(8, 10)}/${dueDate.slice(5, 7)}/${dueDate.slice(0, 4)}`;
        const deviceName = `${record.device.name} (${record.device.code})`;
        const title = daysLeft < 0 ? 'Thiết bị đã quá hạn hiệu chuẩn'
          : daysLeft === 0 ? 'Thiết bị đến hạn hiệu chuẩn hôm nay'
            : 'Thiết bị sắp đến hạn hiệu chuẩn';
        const message = daysLeft < 0
          ? `${deviceName} đã quá hạn hiệu chuẩn từ ${dueLabel}.`
          : daysLeft === 0
            ? `${deviceName} đến hạn hiệu chuẩn hôm nay (${dueLabel}).`
            : `${deviceName} còn ${daysLeft} ngày tới hạn hiệu chuẩn (${dueLabel}).`;

        await this.notificationsService.notifyAdminsOnce({
          title,
          message,
          type: NotificationType.CalibrationDue,
          payload: {
            calibrationId: record.id,
            deviceId: record.device_id,
            dueDate,
            link: `/maintenance?tab=calibration&calibrationId=${record.id}`,
          },
        }, `calibration-due:${record.id}:${bucket}`);
        processed++;
      }
      return processed;
    } finally {
      this.running = false;
    }
  }
}
