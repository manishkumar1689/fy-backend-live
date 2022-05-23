import { ApiProperty } from '@nestjs/swagger';

export class KeyPairValueDTO {
  @ApiProperty()
  readonly k1: string;
  @ApiProperty()
  readonly k2: string;
  @ApiProperty()
  readonly value: number;
}
