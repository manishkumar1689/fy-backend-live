import { ApiProperty } from '@nestjs/swagger';

export class TranslationDTO {
  @ApiProperty()
  readonly lang: string;

  @ApiProperty()
  readonly text: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly alpha: string;
}
