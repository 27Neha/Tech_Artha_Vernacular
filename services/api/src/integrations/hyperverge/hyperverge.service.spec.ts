import { Test, TestingModule } from '@nestjs/testing';
import { HypervergeService } from './hyperverge.service';

describe('HypervergeService', () => {
  let service: HypervergeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HypervergeService],
    }).compile();

    service = module.get<HypervergeService>(HypervergeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
