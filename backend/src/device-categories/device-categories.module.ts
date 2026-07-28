import { Module } from '@nestjs/common';
import { DeviceCategoriesService } from './device-categories.service';
import { DeviceCategoriesController } from './device-categories.controller';

@Module({
  controllers: [DeviceCategoriesController],
  providers: [DeviceCategoriesService],
})
export class DeviceCategoriesModule {}
