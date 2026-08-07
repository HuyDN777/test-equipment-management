import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BorrowRequestStatus } from '../entities/borrow-request.entity';

export class RejectBorrowRequestDto {
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  @IsString()
  rejection_reason: string;
}

export class ReturnDeviceDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BorrowFilterDto {
  @IsOptional()
  @IsEnum(BorrowRequestStatus, { message: 'Trạng thái không hợp lệ' })
  status?: BorrowRequestStatus;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
