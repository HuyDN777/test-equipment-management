import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

export enum BorrowRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Returned = 'Returned',
  Cancelled = 'Cancelled',
}

@Entity('borrow_requests')
export class BorrowRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id' })
  device_id: string;

  @ManyToOne(() => Device, (device) => device.borrowRequests)
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
