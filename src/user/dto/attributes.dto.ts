import { ApiProperty } from '@nestjs/swagger';

export class AttributesDTO {
  @ApiProperty()
  readonly width: number;

  @ApiProperty()
  readonly height: number;

  @ApiProperty()
  readonly orientation: number;

  @ApiProperty()
  readonly duration: number;

  @ApiProperty()
  readonly uploadDate: string;

  @ApiProperty()
  readonly preview: string;
}
