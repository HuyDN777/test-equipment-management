import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestedAccessoryDto {
  @IsUUID()
  accessory_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBorrowRequestDto {
  @IsOptional()
  @IsUUID('all', { message: 'device_id phải là định dạng UUID' })
  device_id?: string;

  @IsOptional()
  @IsUUID('all', { message: 'device_model_id phải là định dạng UUID' })
  device_model_id?: string;

  @IsNotEmpty({ message: 'Ngày mượn không được để trống' })
  @IsDateString({}, { message: 'Ngày mượn phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  borrow_date: string;

  @IsNotEmpty({ message: 'Ngày dự kiến trả không được để trống' })
  @IsDateString({}, { message: 'Ngày dự kiến trả phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  due_date: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RequestedAccessoryDto)
  requested_accessories?: RequestedAccessoryDto[];
}
