import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BorrowRequest } from '../../borrow-requests/entities/borrow-request.entity';
import { MaintenanceRecord } from '../../maintenance/entities/maintenance.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';

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

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  department: string;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
