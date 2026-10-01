import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .addSelect('user.token_version')
      .where('user.email = :email', { email })
      .andWhere('user.is_deleted = :isDeleted', { isDeleted: false })
      .getOne();
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại trong hệ thống');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(createUserDto.password, salt);

    const user = this.usersRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password_hash: password_hash,
      department: createUserDto.department,
      role: createUserDto.role,
      avatar_url: null,
    });

    const savedUser = await this.usersRepository.save(user);
    const { password_hash: _, ...result } = savedUser;
    return result;
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.is_deleted = :isDeleted', { isDeleted: false })
      .select(['user.id', 'user.name', 'user.email', 'user.department', 'user.avatar_url', 'user.role', 'user.created_at', 'user.updated_at'])
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere('(user.name LIKE :search OR user.email LIKE :search OR user.department LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id, is_deleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        avatar_url: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new ConflictException('Không tìm thấy người dùng');
    }

    return user;
  }

  async updateMyProfile(id: string, dto: UpdateMyProfileDto) {
    await this.findOne(id);
    const changes: { name?: string; department?: string } = {};
    if (dto.name !== undefined) changes.name = dto.name.trim();
    if (dto.department !== undefined) changes.department = dto.department.trim();
    if (Object.keys(changes).length > 0) {
      await this.usersRepository.update({ id, is_deleted: false }, changes);
    }
    return this.findOne(id);
  }

  async updateMyAvatar(id: string, avatarUrl: string) {
    const result = await this.usersRepository.update(
      { id, is_deleted: false },
      { avatar_url: avatarUrl },
    );
    if (!result.affected) throw new NotFoundException('Không tìm thấy người dùng');
    return this.findOne(id);
  }

  async changeMyPassword(id: string, dto: ChangePasswordDto) {
    const user = await this.usersRepository.createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.id = :id', { id })
      .andWhere('user.is_deleted = false')
      .getOne();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (!await bcrypt.compare(dto.current_password, user.password_hash)) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (dto.current_password === dto.new_password) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 10);
    const result = await this.usersRepository.update(
      { id, password_hash: user.password_hash, is_deleted: false },
      {
        password_hash: passwordHash,
        token_version: () => 'token_version + 1',
        reset_password_token_hash: null,
        reset_password_expires_at: null,
      },
    );
    if (!result.affected) throw new ConflictException('Mật khẩu đã thay đổi, vui lòng thử lại');
    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { id, is_deleted: false } });
    if (!user) {
      throw new ConflictException('Không tìm thấy người dùng');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.usersRepository.findOne({ where: { email: updateUserDto.email } });
      if (emailExists) {
        throw new ConflictException('Email này đã được sử dụng bởi tài khoản khác');
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.department !== undefined) user.department = updateUserDto.department;
    if (updateUserDto.role) user.role = updateUserDto.role;
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updated = await this.usersRepository.save(user);
    const { password_hash: _, ...result } = updated;
    return result;
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('Bạn không thể xóa tài khoản của chính mình');
    }
    const user = await this.usersRepository.findOne({ where: { id, is_deleted: false } });
    if (!user) {
      throw new ConflictException('Không tìm thấy người dùng');
    }

    if (user.role === 'Admin') {
      const adminCount = await this.usersRepository.count({ where: { role: UserRole.Admin, is_deleted: false } });
      if (adminCount <= 1) {
        throw new BadRequestException('Không thể xóa quản trị viên cuối cùng');
      }
    }
    user.is_deleted = true;
    await this.usersRepository.save(user);
    return { message: 'Đã xóa người dùng thành công' };
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    await this.usersRepository.increment({ id }, 'token_version', 1);
    await this.usersRepository.update(id, {
      password_hash: passwordHash,
      reset_password_token_hash: null,
      reset_password_expires_at: null,
    });
  }

  async findAuthUserById(id: string) {
    return this.usersRepository.createQueryBuilder('user')
      .addSelect('user.token_version')
      .where('user.id = :id', { id })
      .andWhere('user.is_deleted = false')
      .getOne();
  }

  async revokeTokens(id: string) {
    await this.usersRepository.increment({ id }, 'token_version', 1);
  }

  async saveResetToken(id: string, tokenHash: string, expiresAt: Date) {
    await this.usersRepository.update(id, {
      reset_password_token_hash: tokenHash,
      reset_password_expires_at: expiresAt,
    });
  }

  async findByValidResetToken(tokenHash: string) {
    return this.usersRepository.createQueryBuilder('user')
      .addSelect('user.reset_password_token_hash')
      .addSelect('user.reset_password_expires_at')
      .where('user.reset_password_token_hash = :tokenHash', { tokenHash })
      .andWhere('user.reset_password_expires_at > :now', { now: new Date() })
      .andWhere('user.is_deleted = false')
      .getOne();
  }
}
