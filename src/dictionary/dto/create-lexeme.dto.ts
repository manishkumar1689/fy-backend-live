import { ApiProperty } from '@nestjs/swagger';
import { TranslationDTO } from './translation.dto';

export class CreateLexemeDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly original: string;

  @ApiProperty()
  readonly unicode: string;

  @ApiProperty()
  readonly translations: TranslationDTO[];

  @ApiProperty()
  readonly lang: TranslationDTO[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
