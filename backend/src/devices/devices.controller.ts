import { Controller, Get, Post, Body, Put, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
import { DeviceStatus } from './entities/device.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @Roles(UserRole.Admin)
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('category_id') category_id?: string,
    @Query('status') status?: DeviceStatus,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.devicesService.findAll(pageNumber, limitNumber, search, category_id, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.Admin)
  updatePut(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  updatePatch(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }

  @Post(':id/report-issue')
  reportIssue(
    @Param('id') id: string,
    @Request() req: any,
    @Body() reportIssueDto: ReportIssueDto,
  ) {
    return this.devicesService.reportIssue(id, req.user.userId, reportIssueDto);
  }
}

