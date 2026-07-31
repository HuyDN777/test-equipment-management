import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDeviceCategoryDto } from './dto/create-device-category.dto';
import { UpdateDeviceCategoryDto } from './dto/update-device-category.dto';
import { DeviceCategory } from './entities/device-category.entity';
import { Device } from '../devices/entities/device.entity';

@Injectable()
export class DeviceCategoriesService {
  constructor(
    @InjectRepository(DeviceCategory)
    private categoryRepository: Repository<DeviceCategory>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async create(createDto: CreateDeviceCategoryDto) {
    const existing = await this.categoryRepository.findOne({ where: { name: createDto.name } });
    if (existing) {
      throw new ConflictException('Tên danh mục đã tồn tại');
    }
    const category = this.categoryRepository.create(createDto);
    return this.categoryRepository.save(category);
  }

  findAll() {
    return this.categoryRepository.find({ where: { is_deleted: false } });
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id, is_deleted: false } });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  async update(id: string, updateDto: UpdateDeviceCategoryDto) {
    const category = await this.findOne(id);

    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.categoryRepository.findOne({ where: { name: updateDto.name } });
      if (existing) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
    }

    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    const deviceCount = await this.deviceRepository.count({
      where: { device_category_id: id, is_deleted: false },
    });

    if (deviceCount > 0) {
      throw new ConflictException('Không thể xóa danh mục đang có thiết bị');
    }

    category.is_deleted = true;
    await this.categoryRepository.save(category);
    return { message: 'Xóa danh mục thành công' };
  }
}
