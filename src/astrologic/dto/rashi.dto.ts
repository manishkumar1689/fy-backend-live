import { ApiProperty } from '@nestjs/swagger';

export class RashiDTO {
  @ApiProperty()
  readonly houseNum: number;

  @ApiProperty()
  readonly sign: number;

  @ApiProperty()
  readonly lordInHouse: number;

  @ApiProperty()
  readonly arudhaInHouse: number;
}
