import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';
import { DeviceModel } from '../../devices/entities/device-model.entity';

export enum BorrowRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  ReturnPending = 'ReturnPending',
  Rejected = 'Rejected',
  Returned = 'Returned',
  Cancelled = 'Cancelled',
}

export type IssuedAccessory = { accessory_id: string; name: string; quantity: number };
export type ReturnedAccessory = IssuedAccessory;
export type RequestedAccessory = { accessory_id?: string; name: string; quantity: number };

@Entity('borrow_requests')
export class BorrowRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_model_id' })
  device_model_id: string;

  @ManyToOne(() => DeviceModel, (deviceModel) => deviceModel.borrowRequests)
  @JoinColumn({ name: 'device_model_id' })
  deviceModel: DeviceModel;

  @Column({ name: 'device_id', type: 'varchar', length: 36, nullable: true })
  device_id: string | null;

  @ManyToOne(() => Device, (device) => device.borrowRequests, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'users_id' })
  users_id: string;

  @ManyToOne(() => User, (user) => user.borrowRequests)
  @JoinColumn({ name: 'users_id' })
  user: User;

  @Column({ type: 'date' })
  borrow_date: Date;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'date', nullable: true })
  return_date: Date;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ type: 'text', nullable: true })
  return_notes: string | null;

  @Column({ type: 'json', nullable: true })
  requested_accessories: (RequestedAccessory | string)[] | null;

  @Column({ type: 'json', nullable: true })
  issued_accessories: IssuedAccessory[] | null;

  @Column({ type: 'json', nullable: true })
  returned_accessories: ReturnedAccessory[] | null;

  @Column({
    type: 'enum',
    enum: BorrowRequestStatus,
    default: BorrowRequestStatus.Pending,
  })
  status: BorrowRequestStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
