import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{
        provide: NotificationsService,
        useValue: {
          findAll: jest.fn(),
          unreadCount: jest.fn(),
          markAsRead: jest.fn(),
          markAllAsRead: jest.fn(),
          remove: jest.fn(),
        },
      }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
