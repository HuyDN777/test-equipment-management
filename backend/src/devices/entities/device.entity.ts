import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { DeviceCategory } from '../../device-categories/entities/device-category.entity';
import { Accessory } from './accessory.entity';
import { BorrowRequest } from '../../borrow-requests/entities/borrow-request.entity';
import { MaintenanceRecord } from '../../maintenance/entities/maintenance.entity';
import { CalibrationRecord } from '../../maintenance/entities/calibration-record.entity';

export enum DeviceStatus {
  Available = 'Available',
  Borrowed = 'Borrowed',
  Maintenance = 'Maintenance',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_categories_id' })
  device_categories_id: string;

  @ManyToOne(() => DeviceCategory, (category) => category.devices)
  @JoinColumn({ name: 'device_categories_id' })
  category: DeviceCategory;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  model: string;

  @Column({ unique: true, nullable: true })
  serial_number: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.Available,
  })
  status: DeviceStatus;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ default: false })
  is_deleted: boolean;

  @OneToMany(() => Accessory, (accessory) => accessory.device)
  accessories: Accessory[];

  @OneToMany(() => BorrowRequest, (borrowRequest) => borrowRequest.device)
  borrowRequests: BorrowRequest[];

  @OneToMany(() => MaintenanceRecord, (maintenanceRecord) => maintenanceRecord.device)
  maintenanceRecords: MaintenanceRecord[];

  @OneToMany(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.device)
  calibrationRecords: CalibrationRecord[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
