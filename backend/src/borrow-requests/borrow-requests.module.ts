import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRequestsService } from './borrow-requests.service';
import { BorrowRequestsController } from './borrow-requests.controller';
import { BorrowRequest } from './entities/borrow-request.entity';
import { Device } from '../devices/entities/device.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BorrowRequest, Device, User])],
  controllers: [BorrowRequestsController],
  providers: [BorrowRequestsService],
  exports: [BorrowRequestsService],
})
export class BorrowRequestsModule {}
