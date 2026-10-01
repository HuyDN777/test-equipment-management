import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';

describe('UsersService.remove', () => {
  const repository = {
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
  };
  const service = new UsersService(repository as any);

  beforeEach(() => jest.clearAllMocks());

  it('prevents an admin from deleting their own account', async () => {
    await expect(service.remove('admin-1', 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('prevents deleting the last active admin', async () => {
    repository.findOne.mockResolvedValue({ id: 'admin-2', role: UserRole.Admin, is_deleted: false });
    repository.count.mockResolvedValue(1);
    await expect(service.remove('admin-2', 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows deleting another admin when more than one remains', async () => {
    const target = { id: 'admin-2', role: UserRole.Admin, is_deleted: false };
    repository.findOne.mockResolvedValue(target);
    repository.count.mockResolvedValue(2);
    repository.save.mockResolvedValue(target);
    await service.remove('admin-2', 'admin-1');
    expect(target.is_deleted).toBe(true);
    expect(repository.save).toHaveBeenCalledWith(target);
  });
});
