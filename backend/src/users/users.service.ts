import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email, is_deleted: false } });
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
    });

    const savedUser = await this.usersRepository.save(user);
    const { password_hash: _, ...result } = savedUser;
    return result;
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.is_deleted = :isDeleted', { isDeleted: false })
      .select(['user.id', 'user.name', 'user.email', 'user.department', 'user.role', 'user.created_at', 'user.updated_at'])
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

  async remove(id: string) {
    const user = await this.usersRepository.findOne({ where: { id, is_deleted: false } });
    if (!user) {
      throw new ConflictException('Không tìm thấy người dùng');
    }

    user.is_deleted = true;
    await this.usersRepository.save(user);
    return { message: 'Đã xóa người dùng thành công' };
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    await this.usersRepository.update(id, { password_hash: passwordHash });
  }
}
