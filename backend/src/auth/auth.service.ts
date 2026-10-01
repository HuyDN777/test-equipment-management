import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const { password_hash, token_version, ...safeUser } = user;
    return { safeUser, tokenVersion: token_version };
  }

  async login(dto: LoginDto) {
    const { safeUser, tokenVersion } = await this.validateUser(dto.email, dto.password);
    const payload = {
      email: safeUser.email,
      sub: safeUser.id,
      role: safeUser.role,
      tokenVersion,
    };
    return { access_token: this.jwtService.sign(payload), user: safeUser };
  }

  async logout(userId: string) {
    await this.usersService.revokeTokens(userId);
    return { message: 'Đăng xuất thành công' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    let resetToken: string | undefined;

    if (user) {
      resetToken = randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await this.usersService.saveResetToken(user.id, tokenHash, expiresAt);
      await this.mailService.sendPasswordReset(user.email, resetToken);
    }

    return {
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByValidResetToken(this.hashToken(dto.token));
    if (!user) {
      throw new BadRequestException('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 10);
    await this.usersService.updatePasswordHash(user.id, passwordHash);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
