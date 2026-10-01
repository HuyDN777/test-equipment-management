import { Controller, Get, Post, Body, Put, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
import { DeviceStatus } from './entities/device.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ReplenishAccessoryStockDto } from './dto/replenish-accessory-stock.dto';
import { BulkUpdateDeviceLocationDto } from './dto/bulk-update-device-location.dto';

@Controller('api/v1/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('stock')
  @Roles(UserRole.Admin)
  createStock(@Body() createStockDto: CreateStockDto) {
    return this.devicesService.createStock(createStockDto);
  }

  @Patch('bulk/location')
  @Roles(UserRole.Admin)
  bulkUpdateLocation(@Body() dto: BulkUpdateDeviceLocationDto) {
    return this.devicesService.bulkUpdateLocation(dto);
  }

  @Post()
  @Roles(UserRole.Admin)
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @Roles(UserRole.Admin)
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

  @Get('models/catalog')
  findModels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category_id') categoryId?: string,
    @Query('status') status?: DeviceStatus,
  ) {
    return this.devicesService.findModels(Number(page) || 1, Number(limit) || 12, search, categoryId, status);
  }

  @Get('stock/summary')
  @Roles(UserRole.Admin)
  getStockSummary() {
    return this.devicesService.getStockSummary();
  }

  @Get('accessory-stocks')
  @Roles(UserRole.Admin)
  findAccessoryStocks(@Query('model_id') modelId?: string) {
    return this.devicesService.findAccessoryStocks(modelId);
  }

  @Post('accessory-stocks/replenish')
  @Roles(UserRole.Admin)
  replenishAccessoryStock(@Body() dto: ReplenishAccessoryStockDto) {
    return this.devicesService.replenishAccessoryStock(dto);
  }

  @Get('models/:id')
  findModel(@Param('id') id: string) {
    return this.devicesService.findModel(id);
  }

  @Get('models/:id/available-assets')
  @Roles(UserRole.Admin)
  findAvailableAssets(@Param('id') id: string, @Query('search') search?: string) {
    return this.devicesService.findAvailableAssets(id, search);
  }

  @Get('models/:id/assets')
  @Roles(UserRole.Admin)
  findModelAssets(@Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.devicesService.findModelAssets(id, Number(page) || 1, Number(limit) || 10, search);
  }

  @Get(':id')
  @Roles(UserRole.Admin)
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
