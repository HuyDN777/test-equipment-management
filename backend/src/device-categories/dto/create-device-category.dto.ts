import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeviceCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
