import { IsOptional, IsDateString, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { MaintenanceStatus } from '../entities/maintenance.entity';

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsDateString({}, { message: 'end_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  end_date?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus, { message: 'Trạng thái bảo trì không hợp lệ' })
  status?: MaintenanceStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
