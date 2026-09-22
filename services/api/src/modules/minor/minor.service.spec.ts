import { Test, TestingModule } from '@nestjs/testing';
import { MinorService } from './minor.service';

describe('MinorService', () => {
  let service: MinorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MinorService],
    }).compile();

    service = module.get<MinorService>(MinorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
