import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { Device } from './entities/device.entity';
import { Accessory } from './entities/accessory.entity';
import { BorrowRequest } from '../borrow-requests/entities/borrow-request.entity';
import { MaintenanceRecord } from '../maintenance/entities/maintenance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Device, Accessory, BorrowRequest, MaintenanceRecord])],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}

