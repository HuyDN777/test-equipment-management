import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceCategoriesService } from './device-categories.service';
import { DeviceCategoriesController } from './device-categories.controller';
import { DeviceCategory } from './entities/device-category.entity';
import { Device } from '../devices/entities/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceCategory, Device])],
  controllers: [DeviceCategoriesController],
  providers: [DeviceCategoriesService],
})
export class DeviceCategoriesModule {}
