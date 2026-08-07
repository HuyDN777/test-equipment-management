import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BorrowRequest, BorrowRequestStatus } from '../borrow-requests/entities/borrow-request.entity';
import { CalibrationRecord } from '../maintenance/entities/calibration-record.entity';
import { Device, DeviceStatus } from '../devices/entities/device.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(BorrowRequest)
    private borrowRequestRepository: Repository<BorrowRequest>,
    @InjectRepository(CalibrationRecord)
    private calibrationRepository: Repository<CalibrationRecord>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async getCurrentlyBorrowedDevices() {
    return this.borrowRequestRepository
      .createQueryBuilder('borrow')
      .innerJoinAndSelect('borrow.device', 'device')
      .innerJoinAndSelect('borrow.user', 'user')
      .where('borrow.status = :status', { status: BorrowRequestStatus.Approved })
      .andWhere('device.status = :deviceStatus', { deviceStatus: DeviceStatus.Borrowed })
      .select([
        'borrow.id',
        'borrow.borrow_date',
        'borrow.due_date',
        'borrow.reason',
        'device.id',
        'device.code',
        'device.name',
        'device.brand',
        'device.model',
        'device.serial_number',
        'user.id',
        'user.name',
        'user.email',
        'user.department',
      ])
      .orderBy('borrow.due_date', 'ASC')
      .getMany();
  }

  async getCalibrationDueDevices(days = 30) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.calibrationRepository
      .createQueryBuilder('calib')
      .innerJoinAndSelect('calib.device', 'device')
      .leftJoinAndSelect('calib.vendor', 'vendor')
      .where('calib.next_due_date <= :futureDate', {
        futureDate: futureDate.toISOString().split('T')[0],
      })
      .andWhere('device.is_deleted = false')
      .orderBy('calib.next_due_date', 'ASC')
      .getMany();
  }

  async getTopBorrowers(limit = 10) {
    return this.borrowRequestRepository
      .createQueryBuilder('borrow')
      .innerJoin('borrow.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect('user.email', 'userEmail')
      .addSelect('user.department', 'department')
      .addSelect('COUNT(borrow.id)', 'totalBorrows')
      .where('borrow.status IN (:...validStatuses)', {
        validStatuses: [BorrowRequestStatus.Approved, BorrowRequestStatus.Returned],
      })
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.email')
      .addGroupBy('user.department')
      .orderBy('totalBorrows', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getBorrowHistory(deviceId?: string, userId?: string, page = 1, limit = 10) {
    const query = this.borrowRequestRepository
      .createQueryBuilder('borrow')
      .leftJoinAndSelect('borrow.device', 'device')
      .leftJoinAndSelect('borrow.user', 'user')
      .orderBy('borrow.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (deviceId) {
      query.andWhere('borrow.device_id = :deviceId', { deviceId });
    }

    if (userId) {
      query.andWhere('borrow.users_id = :userId', { userId });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
