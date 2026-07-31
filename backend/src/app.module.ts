import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DevicesModule } from './devices/devices.module';
import { UsersModule } from './users/users.module';
import { DeviceCategoriesModule } from './device-categories/device-categories.module';
import { BorrowRequestsModule } from './borrow-requests/borrow-requests.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VendorsModule } from './vendors/vendors.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'devportal',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    DevicesModule, 
    UsersModule, 
    DeviceCategoriesModule, 
    BorrowRequestsModule, 
    MaintenanceModule, 
    NotificationsModule, 
    VendorsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
