import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DeviceCategoriesService } from './device-categories.service';
import { CreateDeviceCategoryDto } from './dto/create-device-category.dto';
import { UpdateDeviceCategoryDto } from './dto/update-device-category.dto';

@Controller('device-categories')
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
    return this.deviceCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeviceCategoryDto: UpdateDeviceCategoryDto) {
    return this.deviceCategoriesService.update(+id, updateDeviceCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deviceCategoriesService.remove(+id);
  }
}
