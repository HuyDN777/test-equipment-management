import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBorrowRequestDto {
  @IsNotEmpty({ message: 'device_id không được để trống' })
  @IsUUID('all', { message: 'device_id phải là định dạng UUID' })
  device_id: string;

  @IsNotEmpty({ message: 'Ngày mượn không được để trống' })
  @IsDateString({}, { message: 'Ngày mượn phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  borrow_date: string;

  @IsNotEmpty({ message: 'Ngày dự kiến trả không được để trống' })
  @IsDateString({}, { message: 'Ngày dự kiến trả phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  due_date: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
