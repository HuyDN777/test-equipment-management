import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class CreateMaintenanceDto {
  @IsNotEmpty({ message: 'device_id không được để trống' })
  @IsUUID('all', { message: 'device_id phải là định dạng UUID' })
  device_id: string;

  @IsNotEmpty({ message: 'Mô tả lỗi (issue) không được để trống' })
  @IsString()
  issue: string;

  @IsNotEmpty({ message: 'Ngày bắt đầu bảo trì không được để trống' })
  @IsDateString({}, { message: 'start_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  start_date: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
