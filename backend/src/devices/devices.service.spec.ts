import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DevicesService } from './devices.service';
import { Device, DeviceStatus } from './entities/device.entity';
import { AccessoryStock } from './entities/accessory-stock.entity';
import { DeviceModel } from './entities/device-model.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { BorrowRequestStatus } from '../borrow-requests/entities/borrow-request.entity';
import { MaintenanceStatus } from '../maintenance/entities/maintenance.entity';

describe('DevicesService', () => {
  let service: DevicesService;
  const manager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const locationQuery = {
    select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const deviceRepository = { count: jest.fn(), createQueryBuilder: jest.fn() };
  const deviceModelRepository = { findOne: jest.fn() };
  const accessoryStockRepository = { createQueryBuilder: jest.fn() };
  const queryRunner = {
    manager,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };
  const accessoryQuery = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const stockWriteQuery = {
    where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null),
    relation: jest.fn().mockReturnThis(), of: jest.fn().mockReturnThis(),
    loadMany: jest.fn().mockResolvedValue([]), add: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
    getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => accessoryQuery) })),
  };
  const notificationsService = { notifyAdmins: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    manager.createQueryBuilder.mockReturnValue(stockWriteQuery);
    accessoryStockRepository.createQueryBuilder.mockReturnValue(accessoryQuery);
    deviceRepository.createQueryBuilder.mockReturnValue(locationQuery);
    locationQuery.getRawMany.mockResolvedValue([]);
    stockWriteQuery.getOne.mockResolvedValue(null);
    stockWriteQuery.loadMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: getRepositoryToken(Device), useValue: deviceRepository },
        { provide: getRepositoryToken(DeviceModel), useValue: deviceModelRepository },
        { provide: getRepositoryToken(AccessoryStock), useValue: accessoryStockRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a physical asset without per-device accessory rows', async () => {
    const transaction = jest.fn(async work => work(manager));
    (dataSource as any).transaction = transaction;
    manager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'model-1', image_url: null });
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation(async (_entity, value) => value);

    await service.create({
      code: 'TB-001', name: 'Phone', device_categories_id: 'category-1',
    });

    expect(manager.save).toHaveBeenCalledWith(Device, expect.objectContaining({ code: 'TB-001' }));
    expect(transaction).toHaveBeenCalled();
  });

  it('adds many machines from one quantity without manually supplied codes', async () => {
    (dataSource as any).transaction = jest.fn(async work => work(manager));
    manager.findOne.mockResolvedValueOnce({ id: 'model-1', name: 'iPhone 15', device_categories_id: 'category-1' });
    manager.create.mockImplementation((_entity, value) => ({ id: `unit-${Math.random()}`, ...value }));
    manager.save.mockImplementation(async (_entity, value) => value);
    manager.count.mockResolvedValue(10);

    const result = await service.createStock({ name: 'iPhone 15', device_categories_id: 'category-1', quantity: 10 });

    expect(result.added_count).toBe(10);
    expect(manager.save).toHaveBeenCalledWith(Device, expect.arrayContaining([
      expect.objectContaining({ code: expect.stringMatching(/^[A-F0-9]{16}$/), status: DeviceStatus.Available }),
    ]), { chunk: 100 });
  });

  it('adds accessories to shared inventory instead of attaching them to each machine', async () => {
    (dataSource as any).transaction = jest.fn(async work => work(manager));
    manager.findOne.mockResolvedValueOnce({ id: 'model-1', name: 'Samsung S22 Ultra', device_categories_id: 'category-1' });
    manager.create.mockImplementation((entity, value) => ({
      id: entity === AccessoryStock ? 'stock-1' : `unit-${Math.random()}`,
      ...value,
    }));
    manager.save.mockImplementation(async (...args) => args.at(-1));
    manager.count.mockResolvedValue(5);

    await service.createStock({
      name: 'Samsung S22 Ultra',
      device_categories_id: 'category-1',
      quantity: 5,
      accessory_stocks: [
        { name: 'Cáp sạc', quantity: 7 },
        { name: 'S Pen', quantity: 5 },
      ],
    });

    expect(manager.save).toHaveBeenCalledWith(AccessoryStock, expect.objectContaining({
      name: 'Cáp sạc', total_quantity: 7, available_quantity: 7,
    }));
    expect(manager.save).toHaveBeenCalledWith(AccessoryStock, expect.objectContaining({
      name: 'S Pen', total_quantity: 5, available_quantity: 5,
    }));
  });

  it('rejects duplicate accessory names in one stock receipt', async () => {
    await expect(service.createStock({
      name: 'Samsung S22 Ultra',
      device_categories_id: 'category-1',
      quantity: 5,
      accessory_stocks: [{ name: 'Cáp sạc', quantity: 3 }, { name: 'cáp sạc', quantity: 4 }],
    })).rejects.toThrow('Tên phụ kiện nhập kho không được trùng nhau');
  });

  it('updates the location of selected available machines together', async () => {
    (dataSource as any).transaction = jest.fn(async work => work(manager));
    const assetQuery = {
      where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([
        { id: 'device-1', device_model_id: 'model-1', status: DeviceStatus.Available, is_deleted: false },
        { id: 'device-2', device_model_id: 'model-1', status: DeviceStatus.Available, is_deleted: false },
      ]),
    };
    manager.createQueryBuilder.mockReturnValueOnce(assetQuery);
    manager.update = jest.fn().mockResolvedValue({ affected: 2 });

    await expect(service.bulkUpdateLocation({ device_model_id: 'model-1', device_ids: ['device-1', 'device-2'], location: '  Tủ A  ' }))
      .resolves.toEqual({ updated_count: 2, location: 'Tủ A' });
    expect(manager.update).toHaveBeenCalledWith(Device, expect.anything(), { location: 'Tủ A' });
  });

  it('does not update any machine if one selected machine is borrowed', async () => {
    (dataSource as any).transaction = jest.fn(async work => work(manager));
    manager.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([
        { id: 'device-1', device_model_id: 'model-1', status: DeviceStatus.Available, is_deleted: false },
        { id: 'device-2', device_model_id: 'model-1', status: DeviceStatus.Borrowed, is_deleted: false },
      ]),
    });
    manager.update = jest.fn();

    await expect(service.bulkUpdateLocation({ device_model_id: 'model-1', device_ids: ['device-1', 'device-2'], location: 'Tủ A' }))
      .rejects.toThrow('Chỉ cập nhật cùng lúc các máy còn sẵn thuộc cùng một model');
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('returns model stock counts without loading all physical machines', async () => {
    deviceModelRepository.findOne.mockResolvedValue({ id: 'model-1', name: 'iPhone 15', image_url: 'https://example.com/phone.png' });
    deviceRepository.count.mockResolvedValueOnce(1000).mockResolvedValueOnce(9);
    locationQuery.getRawMany.mockResolvedValueOnce([{ location: 'Tủ A', count: '6' }, { location: 'Tủ B', count: '3' }]);

    const result = await service.findModel('model-1');

    expect(result).toEqual(expect.objectContaining({ total_count: 1000, available_count: 9 }));
    expect(result.available_locations).toEqual([{ location: 'Tủ A', count: 6 }, { location: 'Tủ B', count: 3 }]);
    expect(result).not.toHaveProperty('devices');
  });

  it('counts the whole warehouse rather than the current admin table page', async () => {
    deviceRepository.count.mockResolvedValueOnce(1000).mockResolvedValueOnce(9)
      .mockResolvedValueOnce(980).mockResolvedValueOnce(11);

    await expect(service.getStockSummary()).resolves.toEqual({
      total: 1000, available: 9, borrowed: 980, maintenance: 11,
    });
  });

  it('moves a reported borrow to return pending and notifies admins', async () => {
    const device = { id: 'device-1', code: 'TB-001', name: 'Phone', status: DeviceStatus.Borrowed };
    const borrow = { id: 'borrow-1', status: BorrowRequestStatus.Approved };
    manager.findOne
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(borrow)
      .mockResolvedValueOnce({ id: 'user-1', name: 'Employee' });
    manager.create.mockReturnValue({ id: 'maintenance-1', status: MaintenanceStatus.Pending });
    manager.save.mockImplementation(async (value) => value);

    await service.reportIssue('device-1', 'user-1', { issue: 'Màn hình bị lỗi' });

    expect(borrow.status).toBe(BorrowRequestStatus.ReturnPending);
    expect(device.status).toBe(DeviceStatus.Borrowed);
    expect(notificationsService.notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DeviceIssueReported' }),
      manager,
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });
});
