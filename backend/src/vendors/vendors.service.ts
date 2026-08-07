import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
  ) {}

  create(createVendorDto: CreateVendorDto) {
    const vendor = this.vendorRepository.create(createVendorDto);
    return this.vendorRepository.save(vendor);
  }

  async findAll(page = 1, limit = 10) {
    const [items, total] = await this.vendorRepository.findAndCount({
      where: { is_deleted: false },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id, is_deleted: false },
      relations: { calibrationRecords: true },
    });

    if (!vendor) {
      throw new NotFoundException('Nhà cung cấp không tồn tại');
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    const vendor = await this.findOne(id);
    Object.assign(vendor, updateVendorDto);
    return this.vendorRepository.save(vendor);
  }

  async remove(id: string) {
    const vendor = await this.findOne(id);
    vendor.is_deleted = true;
    return this.vendorRepository.save(vendor);
  }
}
