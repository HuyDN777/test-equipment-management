import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateNotificationDto, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Notification)
      : this.notificationRepository;
    return repository.save(repository.create({
      ...dto,
      type: dto.type,
      payload: dto.payload ?? null,
      dedupe_key: null,
      is_read: false,
      is_deleted: false,
      read_at: null,
    }));
  }

  async notifyAdmins(
    notification: Omit<CreateNotificationDto, 'user_id'>,
    manager?: EntityManager,
  ) {
    const userRepository = manager ? manager.getRepository(User) : this.userRepository;
    const admins = await userRepository.find({
      where: { role: UserRole.Admin, is_deleted: false },
      select: { id: true },
    });
    if (!admins.length) return [];
    return Promise.all(admins.map((admin) => this.create({
      ...notification,
      user_id: admin.id,
    }, manager)));
  }

  async notifyAdminsOnce(notification: Omit<CreateNotificationDto, 'user_id'>, key: string): Promise<void> {
    const admins = await this.userRepository.find({
      where: { role: UserRole.Admin, is_deleted: false },
      select: { id: true },
    });
    await Promise.all(admins.map(async admin => {
      await this.notificationRepository.createQueryBuilder()
        .insert()
        .into(Notification)
        .values({
          ...notification,
          user_id: admin.id,
          type: notification.type ?? undefined,
          payload: notification.payload ?? null,
          dedupe_key: `${key}:${admin.id}`,
          is_read: false,
          is_deleted: false,
          read_at: null,
        } as QueryDeepPartialEntity<Notification>)
        .orIgnore()
        .execute();
    }));
  }

  async findAll(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .andWhere('notification.is_deleted = false')
      .orderBy('notification.created_at', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);
    if (unreadOnly) query.andWhere('notification.is_read = false');

    const [data, total] = await query.getManyAndCount();
    const unreadCount = await this.notificationRepository.count({
      where: { user_id: userId, is_read: false, is_deleted: false },
    });
    return {
      data,
      total,
      unreadCount,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async unreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { user_id: userId, is_read: false, is_deleted: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.findOwned(id, userId);
    if (!notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date();
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationRepository.createQueryBuilder()
      .update(Notification)
      .set({ is_read: true, read_at: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false')
      .andWhere('is_deleted = false')
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async remove(id: string, userId: string) {
    const notification = await this.findOwned(id, userId);
    notification.is_deleted = true;
    notification.is_read = true;
    notification.read_at = notification.read_at ?? new Date();
    await this.notificationRepository.save(notification);
    return { deleted: true };
  }

  private async findOwned(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, user_id: userId, is_deleted: false },
    });
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');
    return notification;
  }
}
