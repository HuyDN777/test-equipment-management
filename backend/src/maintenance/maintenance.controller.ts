import { Controller, Get, Post, Put, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller(['api/v1/maintenance', 'api/v1/maintenance-records'])
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(UserRole.Admin)
  createMaintenance(@Request() req: any, @Body() createDto: CreateMaintenanceDto) {
    return this.maintenanceService.createMaintenance(req.user.userId, createDto);
  }

  @Get()
  @Roles(UserRole.Admin)
  findAllMaintenance(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.maintenanceService.findAllMaintenance(+page, +limit);
  }

  @Put(':id')
  @Roles(UserRole.Admin)
  updateMaintenancePut(@Param('id') id: string, @Body() updateDto: UpdateMaintenanceDto) {
    return this.maintenanceService.updateMaintenance(id, updateDto);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  updateMaintenancePatch(@Param('id') id: string, @Body() updateDto: UpdateMaintenanceDto) {
    return this.maintenanceService.updateMaintenance(id, updateDto);
  }

  @Post('calibrations')
  @Roles(UserRole.Admin)
  createCalibration(@Body() createDto: CreateCalibrationDto) {
    return this.maintenanceService.createCalibration(createDto);
  }

  @Get('calibrations')
  @Roles(UserRole.Admin)
  findAllCalibration(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.maintenanceService.findAllCalibration(+page, +limit);
  }
}
