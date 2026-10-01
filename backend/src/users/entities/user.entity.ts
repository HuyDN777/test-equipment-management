import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BorrowRequest } from '../../borrow-requests/entities/borrow-request.entity';
import { MaintenanceRecord } from '../../maintenance/entities/maintenance.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { Notification } from '../../notifications/entities/notification.entity';

export enum UserRole {
  Admin = 'Admin',
  Employee = 'Employee',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password_hash: string;

  @Column({ default: 0, select: false })
  token_version: number;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  reset_password_token_hash: string | null;

  @Column({ type: 'datetime', nullable: true, select: false })
  reset_password_expires_at: Date | null;

  @Column({ nullable: true })
  department: string;

  @Column({ type: 'varchar', length: 2048, nullable: true, default: null })
  avatar_url: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.Employee,
  })
  role: UserRole;

  @Column({ default: false })
  is_deleted: boolean;

  @OneToMany(() => BorrowRequest, (borrowRequest) => borrowRequest.user)
  borrowRequests: BorrowRequest[];

  @OneToMany(() => MaintenanceRecord, (maintenanceRecord) => maintenanceRecord.reporter)
  maintenanceReports: MaintenanceRecord[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
