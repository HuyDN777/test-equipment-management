import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MaintenanceRecord, MaintenanceStatus } from './entities/maintenance.entity';
import { CalibrationRecord } from './entities/calibration-record.entity';
import { Device, DeviceStatus } from '../devices/entities/device.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRecord)
    private maintenanceRepository: Repository<MaintenanceRecord>,
    @InjectRepository(CalibrationRecord)
    private calibrationRepository: Repository<CalibrationRecord>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dataSource: DataSource,
  ) {}

  async createMaintenance(reporterId: string, createDto: CreateMaintenanceDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const device = await queryRunner.manager.findOne(Device, {
        where: { id: createDto.device_id, is_deleted: false },
        lock: { mode: 'pessimistic_write' },
      });

      if (!device) {
        throw new NotFoundException('Thiết bị không tồn tại');
      }

      device.status = DeviceStatus.Maintenance;
      await queryRunner.manager.save(device);

      const record = queryRunner.manager.create(MaintenanceRecord, {
        device_id: createDto.device_id,
        reported_by: reporterId,
        issue: createDto.issue,
        start_date: new Date(createDto.start_date),
        cost: createDto.cost,
        notes: createDto.notes,
        status: MaintenanceStatus.InProgress,
      });

      const savedRecord = await queryRunner.manager.save(record);
      await queryRunner.commitTransaction();
      return savedRecord;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateMaintenance(id: string, updateDto: UpdateMaintenanceDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const record = await queryRunner.manager.findOne(MaintenanceRecord, {
        where: { id },
        relations: { device: true },
      });

      if (!record) {
        throw new NotFoundException('Bản ghi bảo trì không tồn tại');
      }

      if (updateDto.status === MaintenanceStatus.Completed && record.status !== MaintenanceStatus.Completed) {
        const device = await queryRunner.manager.findOne(Device, {
          where: { id: record.device_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (device) {
          device.status = DeviceStatus.Available;
          await queryRunner.manager.save(device);
        }

        record.end_date = updateDto.end_date ? new Date(updateDto.end_date) : new Date();
      }

      if (updateDto.status) record.status = updateDto.status;
      if (updateDto.cost !== undefined) record.cost = updateDto.cost;
      if (updateDto.notes) record.notes = updateDto.notes;

      const savedRecord = await queryRunner.manager.save(record);
      await queryRunner.commitTransaction();
      return savedRecord;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllMaintenance(page = 1, limit = 10) {
    const [items, total] = await this.maintenanceRepository.findAndCount({
      relations: { device: true, reporter: true },
      order: { created_at: 'DESC' },
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

  async createCalibration(createDto: CreateCalibrationDto) {
    const device = await this.deviceRepository.findOne({
      where: { id: createDto.device_id, is_deleted: false },
    });

    if (!device) {
      throw new NotFoundException('Thiết bị không tồn tại');
    }

    const calibration = this.calibrationRepository.create({
      device_id: createDto.device_id,
      vendors_id: createDto.vendors_id,
      calibration_type: createDto.calibration_type,
      calibration_date: new Date(createDto.calibration_date),
      next_due_date: new Date(createDto.next_due_date),
      result: createDto.result || 'Pass',
      notes: createDto.notes,
    });

    return this.calibrationRepository.save(calibration);
  }

  async findAllCalibration(page = 1, limit = 10) {
    const [items, total] = await this.calibrationRepository.findAndCount({
      relations: { device: true, vendor: true },
      order: { calibration_date: 'DESC' },
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
}
