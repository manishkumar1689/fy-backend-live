import { ApiProperty } from '@nestjs/swagger';

export class HouseSystemDTO {
  @ApiProperty()
  readonly system: string;
  @ApiProperty()
  readonly values: Array<number>;
}
