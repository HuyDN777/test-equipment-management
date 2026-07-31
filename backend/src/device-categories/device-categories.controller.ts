import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { DeviceCategoriesService } from './device-categories.service';
import { CreateDeviceCategoryDto } from './dto/create-device-category.dto';
import { UpdateDeviceCategoryDto } from './dto/update-device-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class DeviceCategoriesController {
  constructor(private readonly deviceCategoriesService: DeviceCategoriesService) {}

  @Post()
  create(@Body() createDeviceCategoryDto: CreateDeviceCategoryDto) {
    return this.deviceCategoriesService.create(createDeviceCategoryDto);
  }

  @Get()
  findAll() {
    return this.deviceCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deviceCategoriesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDeviceCategoryDto: UpdateDeviceCategoryDto) {
    return this.deviceCategoriesService.update(id, updateDeviceCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deviceCategoriesService.remove(id);
  }
}
