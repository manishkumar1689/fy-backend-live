import { Test, TestingModule } from '@nestjs/testing';
import { SnippetController } from './snippet.controller';

describe('Snippet Controller', () => {
  let controller: SnippetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnippetController],
    }).compile();

    controller = module.get<SnippetController>(SnippetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
