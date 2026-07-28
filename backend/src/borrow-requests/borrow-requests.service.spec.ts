import { Test, TestingModule } from '@nestjs/testing';
import { BorrowRequestsService } from './borrow-requests.service';

describe('BorrowRequestsService', () => {
  let service: BorrowRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BorrowRequestsService],
    }).compile();

    service = module.get<BorrowRequestsService>(BorrowRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
