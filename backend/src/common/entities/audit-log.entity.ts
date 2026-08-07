import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entity_type: string;

  @Column()
  entity_id: string;

  @Column()
  action: string;

  @Column({ name: 'performed_by', nullable: true })
  performed_by: string;

  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  user: User;

  @CreateDateColumn()
  timestamp: Date;
}
