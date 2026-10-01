import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { Device } from './entities/device.entity';
import { Accessory } from './entities/accessory.entity';
import { BorrowRequest } from '../borrow-requests/entities/borrow-request.entity';
import { MaintenanceRecord } from '../maintenance/entities/maintenance.entity';
import { DeviceModel } from './entities/device-model.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccessoryStock } from './entities/accessory-stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceModel, Accessory, AccessoryStock, BorrowRequest, MaintenanceRecord]),
    NotificationsModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
