import { Injectable } from '@nestjs/common';
import { CreateDeviceCategoryDto } from './dto/create-device-category.dto';
import { UpdateDeviceCategoryDto } from './dto/update-device-category.dto';

@Injectable()
export class DeviceCategoriesService {
  create(createDeviceCategoryDto: CreateDeviceCategoryDto) {
    return 'This action adds a new deviceCategory';
  }

  findAll() {
    return `This action returns all deviceCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deviceCategory`;
  }

  update(id: number, updateDeviceCategoryDto: UpdateDeviceCategoryDto) {
    return `This action updates a #${id} deviceCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} deviceCategory`;
  }
}
