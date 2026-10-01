import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class CreateMaintenanceDto {
  @IsUUID()
  device_id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'Nội dung công việc không được để trống' })
  @MaxLength(255)
  issue: string;

  @IsOptional()
  @IsUUID()
  vendors_id?: string;

  @IsOptional()
  @IsDateString()
  planned_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
