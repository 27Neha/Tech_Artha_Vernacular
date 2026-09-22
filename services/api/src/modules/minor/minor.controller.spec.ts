import { Test, TestingModule } from '@nestjs/testing';
import { MinorController } from './minor.controller';

describe('MinorController', () => {
  let controller: MinorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinorController],
    }).compile();

    controller = module.get<MinorController>(MinorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
