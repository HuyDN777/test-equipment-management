import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device, DeviceStatus } from './entities/device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async create(createDto: CreateDeviceDto) {
    const existingCode = await this.deviceRepository.findOne({ where: { code: createDto.code } });
    if (existingCode) {
      throw new ConflictException('Mã thiết bị đã tồn tại');
    }

    if (createDto.serial_number) {
      const existingSerial = await this.deviceRepository.findOne({ where: { serial_number: createDto.serial_number } });
      if (existingSerial) {
        throw new ConflictException('Serial number đã tồn tại');
      }
    }

    const device = this.deviceRepository.create(createDto);
    return this.deviceRepository.save(device);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, category_id?: string, status?: DeviceStatus) {
    const queryBuilder = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.category', 'category')
      .where('device.is_deleted = :isDeleted', { isDeleted: false });

    if (search) {
      queryBuilder.andWhere(
        '(device.name LIKE :search OR device.code LIKE :search OR device.serial_number LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category_id) {
      queryBuilder.andWhere('device.device_category_id = :category_id', { category_id });
    }

    if (status) {
      queryBuilder.andWhere('device.status = :status', { status });
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const device = await this.deviceRepository.findOne({
      where: { id, is_deleted: false },
      relations: { category: true }
    });
    
    if (!device) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }
    return device;
  }

  async update(id: string, updateDto: UpdateDeviceDto) {
    const device = await this.findOne(id);

    if (updateDto.code && updateDto.code !== device.code) {
      const existingCode = await this.deviceRepository.findOne({ where: { code: updateDto.code } });
      if (existingCode) {
        throw new ConflictException('Mã thiết bị đã tồn tại');
      }
    }

    if (updateDto.serial_number && updateDto.serial_number !== device.serial_number) {
      const existingSerial = await this.deviceRepository.findOne({ where: { serial_number: updateDto.serial_number } });
      if (existingSerial) {
        throw new ConflictException('Serial number đã tồn tại');
      }
    }

    Object.assign(device, updateDto);
    return this.deviceRepository.save(device);
  }

  async remove(id: string) {
    const device = await this.findOne(id);

    if (device.status !== DeviceStatus.Available) {
      throw new ConflictException(`Không thể xóa thiết bị đang ở trạng thái ${device.status}`);
    }

    device.is_deleted = true;
    await this.deviceRepository.save(device);
    return { message: 'Xóa thiết bị thành công' };
  }
}
