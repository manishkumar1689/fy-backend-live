import { ApiProperty } from '@nestjs/swagger';

export class LngLatDTO {
  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly lat: number;
}
