import { Test, TestingModule } from '@nestjs/testing';
import { DeviceCategoriesService } from './device-categories.service';

describe('DeviceCategoriesService', () => {
  let service: DeviceCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceCategoriesService],
    }).compile();

    service = module.get<DeviceCategoriesService>(DeviceCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
