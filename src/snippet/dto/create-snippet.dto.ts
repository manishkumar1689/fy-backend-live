import { ApiProperty } from '@nestjs/swagger';
import { VersionDTO } from './version.dto';

export class CreateSnippetDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly published: boolean;

  @ApiProperty()
  readonly values: VersionDTO[];

  @ApiProperty()
  readonly notes: string;

  @ApiProperty()
  readonly format: string;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
