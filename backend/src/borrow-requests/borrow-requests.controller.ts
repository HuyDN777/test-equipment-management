import { Controller, Get, Post, Body, Put, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BorrowRequestsService } from './borrow-requests.service';
import { CreateBorrowRequestDto } from './dto/create-borrow-request.dto';
import { RejectBorrowRequestDto, ReturnDeviceDto, BorrowFilterDto } from './dto/borrow-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/borrow-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BorrowRequestsController {
  constructor(private readonly borrowRequestsService: BorrowRequestsService) {}

  @Post()
  create(@Request() req: any, @Body() createDto: CreateBorrowRequestDto) {
    return this.borrowRequestsService.create(req.user.userId, createDto);
  }

  @Get('me')
  getMyBorrowRequests(@Request() req: any, @Query() filterDto: BorrowFilterDto) {
    return this.borrowRequestsService.findAll(filterDto, { userId: req.user.userId, role: UserRole.Employee });
  }

  @Get()
  findAll(@Request() req: any, @Query() filterDto: BorrowFilterDto) {
    return this.borrowRequestsService.findAll(filterDto, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.borrowRequestsService.findOne(id);
  }

  @Put(':id/approve')
  @Roles(UserRole.Admin)
  approvePut(@Param('id') id: string) {
    return this.borrowRequestsService.approve(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.Admin)
  approvePatch(@Param('id') id: string) {
    return this.borrowRequestsService.approve(id);
  }

  @Put(':id/reject')
  @Roles(UserRole.Admin)
  rejectPut(@Param('id') id: string, @Body() rejectDto: RejectBorrowRequestDto) {
    return this.borrowRequestsService.reject(id, rejectDto);
  }

  @Patch(':id/reject')
  @Roles(UserRole.Admin)
  rejectPatch(@Param('id') id: string, @Body() rejectDto: RejectBorrowRequestDto) {
    return this.borrowRequestsService.reject(id, rejectDto);
  }

  @Post(':id/return')
  returnDevicePost(@Param('id') id: string, @Body() returnDto: ReturnDeviceDto) {
    return this.borrowRequestsService.returnDevice(id, returnDto);
  }

  @Patch(':id/return')
  returnDevicePatch(@Param('id') id: string, @Body() returnDto: ReturnDeviceDto) {
    return this.borrowRequestsService.returnDevice(id, returnDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.borrowRequestsService.cancel(id, req.user);
  }
}

