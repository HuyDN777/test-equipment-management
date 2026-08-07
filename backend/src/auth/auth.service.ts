import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    
    const isMatch = await bcrypt.compare(pass, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    
    const { password_hash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }

  async logout() {
    return {
      message: 'Đăng xuất thành công',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'reset_password' },
      { expiresIn: '15m' }
    );

    return {
      message: 'Yêu cầu đặt lại mật khẩu thành công. Vui lòng sử dụng reset token trong vòng 15 phút.',
      reset_token: resetToken,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(resetPasswordDto.token);
    } catch {
      throw new BadRequestException('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    if (payload.type !== 'reset_password') {
      throw new BadRequestException('Loại token không hợp lệ');
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(resetPasswordDto.new_password, salt);

    await this.usersService.updatePasswordHash(user.id, newPasswordHash);

    return {
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  }
}

