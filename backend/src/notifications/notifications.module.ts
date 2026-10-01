import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { ReportsModule } from '../reports/reports.module';
import { CalibrationReminderService } from './calibration-reminder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), ReportsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, CalibrationReminderService],
  exports: [NotificationsService, CalibrationReminderService],
})
export class NotificationsModule {}
