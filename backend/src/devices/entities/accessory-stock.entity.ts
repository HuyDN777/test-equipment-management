import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeviceModel } from './device-model.entity';

@Entity('accessory_stocks')
@Index('uq_accessory_stocks_name', ['name'], { unique: true })
export class AccessoryStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int', default: 0 })
  total_quantity: number;

  @Column({ type: 'int', default: 0 })
  available_quantity: number;

  @Column({ default: false })
  is_deleted: boolean;

  @ManyToMany(() => DeviceModel, (model) => model.compatibleAccessories)
  @JoinTable({
    name: 'accessory_stock_models',
    joinColumn: { name: 'accessory_stock_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'device_model_id', referencedColumnName: 'id' },
  })
  compatibleModels: DeviceModel[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
