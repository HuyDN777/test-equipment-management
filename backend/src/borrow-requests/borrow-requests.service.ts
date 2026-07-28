import { Injectable } from '@nestjs/common';
import { CreateBorrowRequestDto } from './dto/create-borrow-request.dto';
import { UpdateBorrowRequestDto } from './dto/update-borrow-request.dto';

@Injectable()
export class BorrowRequestsService {
  create(createBorrowRequestDto: CreateBorrowRequestDto) {
    return 'This action adds a new borrowRequest';
  }

  findAll() {
    return `This action returns all borrowRequests`;
  }

  findOne(id: number) {
    return `This action returns a #${id} borrowRequest`;
  }

  update(id: number, updateBorrowRequestDto: UpdateBorrowRequestDto) {
    return `This action updates a #${id} borrowRequest`;
  }

  remove(id: number) {
    return `This action removes a #${id} borrowRequest`;
  }
}
