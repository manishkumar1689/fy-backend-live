import { ApiProperty } from '@nestjs/swagger';
import { CreateSnippetDTO } from './create-snippet.dto';

export class BulkSnippetDTO {
  @ApiProperty()
  readonly items: CreateSnippetDTO[];
}
