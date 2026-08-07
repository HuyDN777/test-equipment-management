import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @IsNotEmpty({ message: 'Tên nhà cung cấp không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contact_info?: string;
}
