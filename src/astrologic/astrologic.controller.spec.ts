import { Test, TestingModule } from '@nestjs/testing';
import { AstrologicController } from './astrologic.controller';

describe('Astrologic Controller', () => {
  let controller: AstrologicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AstrologicController],
    }).compile();

    controller = module.get<AstrologicController>(AstrologicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
