import { ApiProperty } from '@nestjs/swagger';
import { AttributesDTO } from './attributes.dto';

export class MediaItemDTO {
  @ApiProperty()
  readonly filename: string;

  @ApiProperty()
  readonly mime: string;

  @ApiProperty()
  readonly source: string;

  @ApiProperty()
  readonly size: number;

  @ApiProperty()
  readonly attributes: AttributesDTO;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty()
  readonly variants?: string[];
}
