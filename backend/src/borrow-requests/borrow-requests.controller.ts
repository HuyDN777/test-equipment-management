import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BorrowRequestsService } from './borrow-requests.service';
import { CreateBorrowRequestDto } from './dto/create-borrow-request.dto';
import { UpdateBorrowRequestDto } from './dto/update-borrow-request.dto';

@Controller('borrow-requests')
export class BorrowRequestsController {
  constructor(private readonly borrowRequestsService: BorrowRequestsService) {}

  @Post()
  create(@Body() createBorrowRequestDto: CreateBorrowRequestDto) {
    return this.borrowRequestsService.create(createBorrowRequestDto);
  }

  @Get()
  findAll() {
    return this.borrowRequestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.borrowRequestsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBorrowRequestDto: UpdateBorrowRequestDto) {
    return this.borrowRequestsService.update(+id, updateBorrowRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.borrowRequestsService.remove(+id);
  }
}
