import { Test, TestingModule } from '@nestjs/testing';
import { FundsController } from './funds.controller';

describe('FundsController', () => {
  let controller: FundsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundsController],
    }).compile();

    controller = module.get<FundsController>(FundsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
