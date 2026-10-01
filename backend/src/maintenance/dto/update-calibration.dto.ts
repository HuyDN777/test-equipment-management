import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CalibrationResult, CalibrationStatus } from '../entities/calibration-record.entity';

export class UpdateCalibrationDto {
  @IsEnum(CalibrationStatus)
  status: CalibrationStatus;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  calibration_date?: string;

  @IsOptional()
  @IsDateString()
  next_due_date?: string;

  @IsOptional()
  @IsEnum(CalibrationResult)
  result?: CalibrationResult;

  @IsOptional()
  @IsString()
  notes?: string;
}
