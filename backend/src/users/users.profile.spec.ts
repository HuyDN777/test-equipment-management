import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

describe('UsersService profile', () => {
  const id = 'user-1';
  const publicUser = { id, name: 'Old Name', email: 'admin@example.com', department: 'IT', role: UserRole.Admin };
  let repository: jest.Mocked<Pick<Repository<User>, 'findOne' | 'update' | 'createQueryBuilder'>>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    service = new UsersService(repository as unknown as Repository<User>);
  });

  it('creates a new account without a custom avatar', async () => {
    const create = jest.fn((input: Partial<User>) => input);
    const save = jest.fn(async (user: Partial<User>) => user);
    const createRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create,
      save,
    } as unknown as Repository<User>;
    const createService = new UsersService(createRepository);

    const created = await createService.create({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      role: UserRole.Employee,
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: null }));
    expect(created.avatar_url).toBeNull();
  });

  it('only updates editable profile fields, ignoring role and password', async () => {
    repository.findOne.mockResolvedValue(publicUser as User);
    repository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

    await service.updateMyProfile(id, {
      name: ' New Name ',
      department: ' QA ',
      role: UserRole.Employee,
      password: 'new-password',
    } as never);

    expect(repository.update).toHaveBeenCalledWith(
      { id, is_deleted: false },
      { name: 'New Name', department: 'QA' },
    );
  });

  it('stores the uploaded avatar URL for the requested user', async () => {
    repository.findOne.mockResolvedValue({ ...publicUser, avatar_url: 'https://res.cloudinary.com/example/avatar.jpg' } as User);
    repository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

    const result = await service.updateMyAvatar(id, 'https://res.cloudinary.com/example/avatar.jpg');

    expect(repository.update).toHaveBeenCalledWith(
      { id, is_deleted: false },
      { avatar_url: 'https://res.cloudinary.com/example/avatar.jpg' },
    );
    expect(result.avatar_url).toBe('https://res.cloudinary.com/example/avatar.jpg');
  });

  it('rejects an incorrect current password without writing', async () => {
    const password_hash = await bcrypt.hash('old-password', 4);
    const query = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ ...publicUser, password_hash }),
    };
    repository.createQueryBuilder.mockReturnValue(query as never);

    await expect(service.changeMyPassword(id, {
      current_password: 'wrong-password',
      new_password: 'new-password',
    })).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('changes password and revokes existing tokens in one update', async () => {
    const password_hash = await bcrypt.hash('old-password', 4);
    const query = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ ...publicUser, password_hash }),
    };
    repository.createQueryBuilder.mockReturnValue(query as never);
    repository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

    await service.changeMyPassword(id, {
      current_password: 'old-password',
      new_password: 'new-password',
    });

    expect(repository.update).toHaveBeenCalledTimes(1);
    const [criteria, changes] = repository.update.mock.calls[0];
    expect(criteria).toEqual({ id, password_hash, is_deleted: false });
    expect(await bcrypt.compare('new-password', changes.password_hash as string)).toBe(true);
    expect(changes.token_version).toEqual(expect.any(Function));
    expect(changes.reset_password_token_hash).toBeNull();
  });
});
