import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';

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

  @Column({ type: 'date' })
  calibration_date: Date;

  @Column({ type: 'date' })
  next_due_date: Date;

  @Column({ default: 'Pass' })
  result: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
