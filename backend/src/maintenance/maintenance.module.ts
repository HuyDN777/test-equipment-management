import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { CalibrationRecordsController } from './calibration-records.controller';
import { MaintenanceRecord } from './entities/maintenance.entity';
import { CalibrationRecord } from './entities/calibration-record.entity';
import { Device } from '../devices/entities/device.entity';
import { User } from '../users/entities/user.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceRecord, CalibrationRecord, Device, User, Vendor]),
    NotificationsModule,
  ],
  controllers: [MaintenanceController, CalibrationRecordsController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
