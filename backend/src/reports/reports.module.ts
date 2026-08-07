import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { BorrowRequest } from '../borrow-requests/entities/borrow-request.entity';
import { CalibrationRecord } from '../maintenance/entities/calibration-record.entity';
import { Device } from '../devices/entities/device.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BorrowRequest, CalibrationRecord, Device, User])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
