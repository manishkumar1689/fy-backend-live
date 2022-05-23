import { ApiProperty } from '@nestjs/swagger';

export class AspectItemDTO {
  @ApiProperty()
  key: string;
  @ApiProperty()
  k1: string;
  @ApiProperty()
  k2: string;
  @ApiProperty()
  orb?: number;
}
