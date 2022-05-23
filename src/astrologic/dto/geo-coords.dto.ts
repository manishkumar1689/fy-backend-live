import { ApiProperty } from '@nestjs/swagger';

export class GeoCoordsDTO {
  @ApiProperty()
  readonly lat: number;

  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly alt?: number;
}
