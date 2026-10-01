import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt, IsUUID, Max, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BorrowRequestStatus } from '../entities/borrow-request.entity';

export class RejectBorrowRequestDto {
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  @IsString()
  rejection_reason: string;
}

export class ReturnedAccessoryDto {
  @IsUUID()
  accessory_id: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;
}

export class ApproveBorrowRequestDto {
  @IsOptional()
  @IsUUID()
  device_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnedAccessoryDto)
  accessories?: ReturnedAccessoryDto[];
}

export class ReturnDeviceDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnedAccessoryDto)
  accessories?: ReturnedAccessoryDto[];
}

export class BorrowFilterDto {
  @IsOptional()
  @IsEnum(BorrowRequestStatus, { message: 'Trạng thái không hợp lệ' })
  status?: BorrowRequestStatus;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsUUID()
  device_id?: string;

  @IsOptional()
  @IsUUID()
  device_model_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
