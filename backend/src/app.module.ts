import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DevicesModule } from './devices/devices.module';
import { UsersModule } from './users/users.module';
import { DeviceCategoriesModule } from './device-categories/device-categories.module';
import { BorrowRequestsModule } from './borrow-requests/borrow-requests.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [DevicesModule, UsersModule, DeviceCategoriesModule, BorrowRequestsModule, MaintenanceModule, NotificationsModule, VendorsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
