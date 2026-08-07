import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CalibrationRecord } from '../../maintenance/entities/calibration-record.entity';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  contact_info: string;

  @Column({ default: false })
  is_deleted: boolean;

  @OneToMany(() => CalibrationRecord, (calibration) => calibration.vendor)
  calibrationRecords: CalibrationRecord[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
