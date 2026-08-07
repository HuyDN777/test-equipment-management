import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/calibration-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class CalibrationRecordsController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  createCalibration(@Body() createDto: CreateCalibrationDto) {
    return this.maintenanceService.createCalibration(createDto);
  }

  @Get()
  findAllCalibration(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.maintenanceService.findAllCalibration(+page, +limit);
  }
}
