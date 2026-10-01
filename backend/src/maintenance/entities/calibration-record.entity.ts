import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';

export enum CalibrationStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
}

export enum CalibrationResult {
  Pass = 'Pass',
  Fail = 'Fail',
}

@Entity('calibration_records')
export class CalibrationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id' })
  device_id: string;

  @ManyToOne(() => Device, (device) => device.calibrationRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'vendors_id', nullable: true })
  vendors_id: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.calibrationRecords, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendors_id' })
  vendor: Vendor;

  @Column()
  calibration_type: string;

  @Column({ type: 'date', nullable: true })
  planned_date: Date | null;

  @Column({ type: 'date', nullable: true })
  start_date: Date | null;

  @Column({ type: 'date', nullable: true })
  calibration_date: Date | null;

  @Column({ type: 'date', nullable: true })
  next_due_date: Date | null;

  @Column({ type: 'enum', enum: CalibrationStatus, default: CalibrationStatus.Pending })
  status: CalibrationStatus;

  @Column({ type: 'varchar', length: 16, nullable: true })
  result: CalibrationResult | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
