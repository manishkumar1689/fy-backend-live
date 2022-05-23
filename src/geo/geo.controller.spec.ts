import { Test, TestingModule } from '@nestjs/testing';
import { GeoController } from './geo.controller';

describe('Geo Controller', () => {
  let controller: GeoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeoController],
    }).compile();

    controller = module.get<GeoController>(GeoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
