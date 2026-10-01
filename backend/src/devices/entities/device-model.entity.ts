import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DeviceCategory } from '../../device-categories/entities/device-category.entity';
import { BorrowRequest } from '../../borrow-requests/entities/borrow-request.entity';
import { Device } from './device.entity';
import { AccessoryStock } from './accessory-stock.entity';

@Entity('device_models')
export class DeviceModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_categories_id' })
  device_categories_id: string;

  @ManyToOne(() => DeviceCategory)
  @JoinColumn({ name: 'device_categories_id' })
  category: DeviceCategory;

  @Column()
  name: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  model: string;

  @Column({ type: 'json', nullable: true })
  specifications: unknown;

  @Column({ nullable: true })
  image_url: string;

  @Column({ default: false })
  is_deleted: boolean;

  @OneToMany(() => Device, (device) => device.deviceModel)
  devices: Device[];

  @OneToMany(() => BorrowRequest, (request) => request.deviceModel)
  borrowRequests: BorrowRequest[];

  @ManyToMany(() => AccessoryStock, (accessory) => accessory.compatibleModels)
  compatibleAccessories: AccessoryStock[];
}
