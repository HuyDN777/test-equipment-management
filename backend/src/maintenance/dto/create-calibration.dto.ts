import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateCalibrationDto {
  @IsUUID()
  device_id: string;

  @IsUUID()
  vendors_id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'Loại hiệu chuẩn không được để trống' })
  @MaxLength(255)
  calibration_type: string;

  @IsOptional()
  @IsDateString()
  planned_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
