import { Test, TestingModule } from '@nestjs/testing';
import { AstrologicService } from './astrologic.service';

describe('AstrologicService', () => {
  let service: AstrologicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AstrologicService],
    }).compile();

    service = module.get<AstrologicService>(AstrologicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
