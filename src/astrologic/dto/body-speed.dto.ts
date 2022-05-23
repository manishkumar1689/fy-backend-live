import { ApiProperty } from '@nestjs/swagger';

export class BodySpeedDTO {
  @ApiProperty()
  readonly jd: number;

  @ApiProperty()
  readonly datetime: string;

  @ApiProperty()
  readonly num: number;

  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly speed: number;

  @ApiProperty()
  readonly acceleration: number;

  @ApiProperty()
  readonly station: string;
}
