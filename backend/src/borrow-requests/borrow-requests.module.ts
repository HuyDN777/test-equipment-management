import { Module } from '@nestjs/common';
import { BorrowRequestsService } from './borrow-requests.service';
import { BorrowRequestsController } from './borrow-requests.controller';

@Module({
  controllers: [BorrowRequestsController],
  providers: [BorrowRequestsService],
})
export class BorrowRequestsModule {}
