import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  BorrowRequestCreated = 'BorrowRequestCreated',
  BorrowRequestApproved = 'BorrowRequestApproved',
  BorrowRequestRejected = 'BorrowRequestRejected',
  BorrowRequestReturned = 'BorrowRequestReturned',
  BorrowRequestCancelled = 'BorrowRequestCancelled',
  DeviceIssueReported = 'DeviceIssueReported',
  CalibrationDue = 'CalibrationDue',
  Info = 'Info',
}

@Entity('notifications')
@Index('uq_notifications_dedupe_key', ['dedupe_key'], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.Info })
  type: NotificationType;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  dedupe_key: string | null;

  @Column({ default: false })
  is_read: boolean;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  read_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
