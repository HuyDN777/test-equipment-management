import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

export enum MaintenanceStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
}

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id' })
  device_id: string;

  @ManyToOne(() => Device, (device) => device.maintenanceRecords)
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'reported_by', nullable: true })
  reported_by: string;

  @ManyToOne(() => User, (user) => user.maintenanceReports, { nullable: true })
  @JoinColumn({ name: 'reported_by' })
  reporter: User;

  @Column()
  issue: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.Pending,
  })
  status: MaintenanceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
