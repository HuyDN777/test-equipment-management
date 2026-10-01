import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'System Administrator';
  const department = process.env.ADMIN_DEPARTMENT?.trim() || 'IT';

  if (!email || !password) {
    throw new Error('Cần cung cấp ADMIN_EMAIL và ADMIN_PASSWORD');
  }
  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD phải có ít nhất 6 ký tự');
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const usersService = app.get(UsersService);
    const existingUser = await usersService.findByEmail(email);
    if (existingUser) {
      throw new Error(`Tài khoản ${email} đã tồn tại; không ghi đè tài khoản hiện có`);
    }

    const admin = await usersService.create({
      name,
      email,
      password,
      department,
      role: UserRole.Admin,
    });
    process.stdout.write(`Đã tạo Admin: ${admin.email}\n`);
  } finally {
    await app.close();
  }
}

createAdmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Không thể tạo Admin: ${message}\n`);
  process.exitCode = 1;
});
