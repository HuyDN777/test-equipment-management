import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BorrowRequestsService } from './borrow-requests.service';
import { BorrowRequest, BorrowRequestStatus } from './entities/borrow-request.entity';
import { Device } from '../devices/entities/device.entity';
import { UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessoryStock } from '../devices/entities/accessory-stock.entity';

describe('BorrowRequestsService', () => {
  let service: BorrowRequestsService;
  const requestRepository = {
    findOne: jest.fn(), create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn(),
  };
  const deviceRepository = { findOne: jest.fn() };
  const dataSource = { createQueryRunner: jest.fn() };
  const notificationsService = { create: jest.fn(), notifyAdmins: jest.fn() };
  const accessoryQuery = {
    innerJoin: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(), getMany: jest.fn(), getOne: jest.fn(),
  };
  const manager = {
    findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(),
    update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn(),
  };
  const queryRunner = {
    manager,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    manager.createQueryBuilder.mockReturnValue(accessoryQuery);
    accessoryQuery.getMany.mockResolvedValue([{ id: 'accessory-1', name: 'Cáp sạc', available_quantity: 2 }]);
    accessoryQuery.getOne.mockResolvedValue({
      id: 'accessory-1', name: 'Cáp sạc', total_quantity: 2, available_quantity: 2,
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowRequestsService,
        { provide: getRepositoryToken(BorrowRequest), useValue: requestRepository },
        { provide: getRepositoryToken(Device), useValue: deviceRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();
    service = module.get(BorrowRequestsService);
  });

  it('rejects a borrow date in the past', async () => {
    await expect(service.create('user-1', {
      device_id: 'device-1', borrow_date: '2020-01-01', due_date: '2020-01-02',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(deviceRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a due date before the borrow date', async () => {
    await expect(service.create('user-1', {
      device_id: 'device-1', borrow_date: '2099-01-02', due_date: '2099-01-01',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows borrowing and returning on the same day', async () => {
    const dto = { device_model_id: 'model-1', borrow_date: '2099-01-01', due_date: '2099-01-01' };
    const entity = { ...dto, device_id: null, users_id: 'user-1', status: BorrowRequestStatus.Pending };
    manager.findOne
      .mockResolvedValueOnce({ id: 'model-1' })
      .mockResolvedValueOnce(null);
    manager.create.mockReturnValue(entity);
    manager.save.mockResolvedValue(entity);
    await expect(service.create('user-1', dto)).resolves.toEqual(entity);
    expect(manager.save).toHaveBeenCalledWith(entity);
    expect(notificationsService.notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BorrowRequestCreated',
        payload: expect.objectContaining({ link: '/borrow-requests' }),
      }),
      manager,
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('saves only the accessories selected by the employee in the request', async () => {
    manager.findOne.mockResolvedValueOnce({ id: 'model-1', name: 'iPhone 15' }).mockResolvedValueOnce(null);
    manager.create.mockImplementation((_entity, values) => values);
    manager.save.mockImplementation(async entity => entity);

    await service.create('user-1', {
      device_model_id: 'model-1', borrow_date: '2099-01-01', due_date: '2099-01-01',
      requested_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 2 }],
    });

    expect(manager.create).toHaveBeenCalledWith(BorrowRequest,
      expect.objectContaining({ requested_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 2 }] }));
  });

  it('rejects non-positive accessory quantities', async () => {
    await expect(service.create('user-1', {
      device_model_id: 'model-1', borrow_date: '2099-01-01', due_date: '2099-01-01',
      requested_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 0 }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('rejects quantities above the shared available stock', async () => {
    manager.findOne.mockResolvedValueOnce({ id: 'model-1' }).mockResolvedValueOnce(null);

    await expect(service.create('user-1', {
      device_model_id: 'model-1', borrow_date: '2099-01-01', due_date: '2099-01-01',
      requested_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 3 }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('prevents an employee from viewing another employee request', async () => {
    requestRepository.findOne.mockResolvedValue({ id: 'request-1', users_id: 'owner-1' });
    await expect(service.findOneForUser('request-1', {
      userId: 'other-1', role: UserRole.Employee,
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an admin to view another employee request', async () => {
    const request = { id: 'request-1', users_id: 'owner-1' };
    requestRepository.findOne.mockResolvedValue(request);
    await expect(service.findOneForUser('request-1', {
      userId: 'admin-1', role: UserRole.Admin,
    })).resolves.toBe(request);
  });

  it('only snapshots accessories requested and confirmed at handover', async () => {
    const request = {
      id: 'request-1', users_id: 'user-1', device_model_id: 'model-1', status: BorrowRequestStatus.Pending,
      requested_accessories: ['Cáp sạc'],
    };
    const device = { id: 'device-1', code: 'TB-001', status: 'Available' };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce(device);
    accessoryQuery.getOne.mockResolvedValue({ id: 'accessory-1', name: 'Cáp sạc', total_quantity: 1, available_quantity: 1 });
    manager.save.mockImplementation(async (...args) => args.at(-1));

    await service.approve('request-1', {
      accessories: [{ accessory_id: 'accessory-1', quantity: 1 }],
    });

    expect(request).toEqual(expect.objectContaining({
      issued_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 1 }],
    }));
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('uses the requested quantity when handing over accessories', async () => {
    const request = {
      id: 'request-1', users_id: 'user-1', device_model_id: 'model-1', status: BorrowRequestStatus.Pending,
      requested_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 2 }],
    };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce({ id: 'device-1', status: 'Available' });
    accessoryQuery.getOne.mockResolvedValue({ id: 'accessory-1', name: 'Cáp sạc', total_quantity: 2, available_quantity: 2 });
    manager.save.mockImplementation(async (...args) => args.at(-1));

    await service.approve('request-1', {
      accessories: [{ accessory_id: 'accessory-1', quantity: 2 }],
    });

    expect(request).toEqual(expect.objectContaining({
      issued_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 2 }],
    }));
    expect(manager.save).toHaveBeenCalledWith(AccessoryStock, expect.objectContaining({ available_quantity: 0 }));
  });

  it('rejects handing over more accessories than the employee requested', async () => {
    const request = {
      id: 'request-1', users_id: 'user-1', device_model_id: 'model-1', status: BorrowRequestStatus.Pending,
      requested_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 2 }],
    };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce({ id: 'device-1', status: 'Available' });
    accessoryQuery.getOne.mockResolvedValue({ id: 'accessory-1', name: 'Cáp sạc', total_quantity: 3, available_quantity: 3 });

    await expect(service.approve('request-1', {
      accessories: [{ accessory_id: 'accessory-1', quantity: 3 }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('does not auto-issue accessories when the employee requested none', async () => {
    const request = {
      id: 'request-1', users_id: 'user-1', device_model_id: 'model-1', status: BorrowRequestStatus.Pending,
      requested_accessories: [],
    };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce({ id: 'device-1', status: 'Available' });
    manager.save.mockImplementation(async (...args) => args.at(-1));

    await service.approve('request-1');

    expect(request).toEqual(expect.objectContaining({ issued_accessories: [] }));
  });

  it('rejects handing over an accessory the employee did not request', async () => {
    const request = {
      id: 'request-1', users_id: 'user-1', device_model_id: 'model-1', status: BorrowRequestStatus.Pending,
      requested_accessories: [],
    };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce({ id: 'device-1', status: 'Available' });
    accessoryQuery.getOne.mockResolvedValue({ id: 'accessory-1', name: 'Cáp sạc', total_quantity: 1, available_quantity: 1 });

    await expect(service.approve('request-1', {
      accessories: [{ accessory_id: 'accessory-1', quantity: 1 }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('requires a full accessory count at return', async () => {
    const request = {
      id: 'request-1', device_id: 'device-1', status: BorrowRequestStatus.Approved,
      issued_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 1 }],
    };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce({ id: 'device-1', status: 'Borrowed' });

    await expect(service.returnDevice('request-1', { accessories: [] })).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('reduces shared total stock without sending the asset to maintenance if an accessory is missing', async () => {
    const request = {
      id: 'request-1', device_id: 'device-1', users_id: 'user-1', status: BorrowRequestStatus.Approved,
      issued_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 1 }],
    };
    const device = { id: 'device-1', code: 'TB-001', status: 'Borrowed' };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce(device)
      .mockResolvedValueOnce({ id: 'accessory-1', name: 'Cáp sạc', total_quantity: 1, available_quantity: 0, is_deleted: false })
      .mockResolvedValueOnce(null);
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation(async (...args) => args.at(-1));

    await service.returnDevice('request-1', {
      accessories: [{ accessory_id: 'accessory-1', quantity: 0 }],
    });

    expect(device.status).toBe('Available');
    expect(request).toEqual(expect.objectContaining({
      returned_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 0 }],
    }));
    expect(request.return_notes).toContain('Thiếu phụ kiện');
    expect(manager.save).toHaveBeenCalledWith(AccessoryStock, expect.objectContaining({
      total_quantity: 0,
      available_quantity: 0,
    }));
    expect(manager.create).not.toHaveBeenCalled();
  });

  it('records surplus accessories without marking them missing or sending the asset to maintenance', async () => {
    const request = {
      id: 'request-1', device_id: 'device-1', users_id: 'user-1', status: BorrowRequestStatus.Approved,
      issued_accessories: [{ accessory_id: 'accessory-1', name: 'Cáp sạc', quantity: 1 }],
    };
    const device = { id: 'device-1', code: 'TB-001', status: 'Borrowed' };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce(device)
      .mockResolvedValueOnce({ id: 'accessory-1', name: 'Cáp sạc', total_quantity: 1, available_quantity: 0, is_deleted: false })
      .mockResolvedValueOnce(null);
    manager.save.mockImplementation(async (...args) => args.at(-1));

    await service.returnDevice('request-1', {
      accessories: [{ accessory_id: 'accessory-1', quantity: 2 }],
    });

    expect(device.status).toBe('Available');
    expect(request.status).toBe(BorrowRequestStatus.Returned);
    const returnNotes = (request as typeof request & { return_notes: string }).return_notes;
    expect(returnNotes).toContain('Thừa phụ kiện');
    expect(returnNotes).not.toContain('Thiếu phụ kiện');
    expect(manager.save).toHaveBeenCalledWith(AccessoryStock, expect.objectContaining({
      total_quantity: 2,
      available_quantity: 2,
    }));
    expect(manager.create).not.toHaveBeenCalled();
  });

  it('returns an asset without accessories directly to available inventory', async () => {
    const request = {
      id: 'request-1', device_id: 'device-1', users_id: 'user-1', status: BorrowRequestStatus.Approved,
      issued_accessories: [],
    };
    const device = { id: 'device-1', code: 'TB-001', status: 'Borrowed' };
    manager.findOne.mockResolvedValueOnce(request).mockResolvedValueOnce(device).mockResolvedValueOnce(null);
    manager.save.mockImplementation(async (...args) => args.at(-1));

    await service.returnDevice('request-1', { accessories: [] });

    expect(device.status).toBe('Available');
    expect(manager.create).not.toHaveBeenCalled();
  });
});
