import { Test, TestingModule } from '@nestjs/testing';
import { DeviceCategoriesController } from './device-categories.controller';
import { DeviceCategoriesService } from './device-categories.service';

describe('DeviceCategoriesController', () => {
  let controller: DeviceCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceCategoriesController],
      providers: [DeviceCategoriesService],
    }).compile();

    controller = module.get<DeviceCategoriesController>(DeviceCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
