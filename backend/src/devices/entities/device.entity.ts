import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DeviceCategory } from '../../device-categories/entities/device-category.entity';

export enum DeviceStatus {
  Available = 'Available',
  Borrowed = 'Borrowed',
  Maintenance = 'Maintenance',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_category_id' })
  device_category_id: string;

  @ManyToOne(() => DeviceCategory, (category) => category.devices)
  @JoinColumn({ name: 'device_category_id' })
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
