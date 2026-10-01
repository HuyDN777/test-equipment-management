import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationType } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('ghi nhắc hạn bằng khóa duy nhất cho từng admin', async () => {
    const builder: any = {
      insert: jest.fn(), into: jest.fn(), values: jest.fn(), orIgnore: jest.fn(), execute: jest.fn().mockResolvedValue({}),
    };
    for (const method of ['insert', 'into', 'values', 'orIgnore']) builder[method].mockReturnValue(builder);
    const notifications = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const users = { find: jest.fn().mockResolvedValue([{ id: 'admin-1' }]) };
    const subject = new NotificationsService(notifications as any, users as any);

    await subject.notifyAdminsOnce({ title: 'Sắp đến hạn', message: 'Thiết bị A', type: NotificationType.CalibrationDue }, 'calibration-due:cal-1:7-day');

    expect(builder.values).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'admin-1',
      dedupe_key: 'calibration-due:cal-1:7-day:admin-1',
    }));
    expect(builder.orIgnore).toHaveBeenCalled();
  });

  it('ẩn thông báo đã xóa nhưng giữ khóa chống gửi lại', async () => {
    const item = { id: 'notice-1', user_id: 'admin-1', is_deleted: false, is_read: false, read_at: null, dedupe_key: 'key-1' };
    const notifications = { findOne: jest.fn().mockResolvedValue(item), save: jest.fn(async value => value) };
    const subject = new NotificationsService(notifications as any, {} as any);

    await subject.remove('notice-1', 'admin-1');

    expect(item.is_deleted).toBe(true);
    expect(item.dedupe_key).toBe('key-1');
    expect(notifications.save).toHaveBeenCalledWith(item);
  });
});
