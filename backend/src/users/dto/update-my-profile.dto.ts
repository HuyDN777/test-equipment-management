import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'Tên không được để trống' })
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
