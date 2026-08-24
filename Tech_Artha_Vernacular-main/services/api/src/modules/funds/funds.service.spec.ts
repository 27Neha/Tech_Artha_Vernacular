import { Test, TestingModule } from '@nestjs/testing';
import { FundsService } from './funds.service';

describe('FundsService', () => {
  let service: FundsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FundsService],
    }).compile();

    service = module.get<FundsService>(FundsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
