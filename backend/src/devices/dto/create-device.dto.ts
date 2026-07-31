import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeviceStatus } from '../entities/device.entity';

export class CreateDeviceDto {
  @IsNotEmpty({ message: 'Code không được để trống' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: 'Tên thiết bị không được để trống' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'ID danh mục không được để trống' })
  @IsString()
  device_category_id: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsEnum(DeviceStatus, { message: 'Trạng thái không hợp lệ' })
  status?: DeviceStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  image_url?: string;
}
