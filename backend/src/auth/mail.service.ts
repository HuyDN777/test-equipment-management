import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, token: string) {
    const host = this.config.get<string>('SMTP_HOST') || this.config.get<string>('EMAIL_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') || this.config.get<string>('EMAIL_PORT') || 587);
    const user = this.config.get<string>('SMTP_USER') || this.config.get<string>('EMAIL_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD') || this.config.get<string>('EMAIL_PASS');

    if (!host || !user || !pass) {
      throw new ServiceUnavailableException('Máy chủ gửi email chưa được cấu hình');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: { user, pass: pass.replace(/\s/g, '') },
    });

    const frontendUrl = this.config.get<string>('EMPLOYEE_FRONTEND_URL', 'http://localhost:5174');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM') || `DEVPORTAL <${user}>`,
      to: email,
      subject: 'Đặt lại mật khẩu DEVPORTAL',
      text: `Mở liên kết sau để đặt lại mật khẩu (có hiệu lực 15 phút): ${resetUrl}`,
      html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu DEVPORTAL.</p><p><a href="${resetUrl}">Đặt lại mật khẩu</a></p><p>Liên kết có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
    });
  }
}
