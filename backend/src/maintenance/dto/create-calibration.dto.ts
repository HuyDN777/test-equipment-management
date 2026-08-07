import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCalibrationDto {
  @IsNotEmpty({ message: 'device_id không được để trống' })
  @IsUUID('all', { message: 'device_id phải là định dạng UUID' })
  device_id: string;

  @IsOptional()
  @IsUUID('all', { message: 'vendors_id phải là định dạng UUID' })
  vendors_id?: string;

  @IsNotEmpty({ message: 'Loại hiệu chuẩn không được để trống' })
  @IsString()
  calibration_type: string;

  @IsNotEmpty({ message: 'Ngày hiệu chuẩn không được để trống' })
  @IsDateString({}, { message: 'calibration_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  calibration_date: string;

  @IsNotEmpty({ message: 'Hạn hiệu chuẩn tiếp theo không được để trống' })
  @IsDateString({}, { message: 'next_due_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  next_due_date: string;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
