import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('borrowed-devices')
  getCurrentlyBorrowedDevices() {
    return this.reportsService.getCurrentlyBorrowedDevices();
  }

  @Get('calibration-due')
  getCalibrationDueDevices(@Query('days') days = 30) {
    return this.reportsService.getCalibrationDueDevices(+days);
  }

  @Get('top-borrowers')
  getTopBorrowers(@Query('limit') limit = 10) {
    return this.reportsService.getTopBorrowers(+limit);
  }

  @Get('borrow-history')
  getBorrowHistory(
    @Query('device_id') deviceId?: string,
    @Query('user_id') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reportsService.getBorrowHistory(deviceId, userId, +page, +limit);
  }
}
