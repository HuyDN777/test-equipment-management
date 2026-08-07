import { IsNotEmpty, MinLength, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Reset token không được để trống' })
  token: string;

  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  new_password: string;
}
