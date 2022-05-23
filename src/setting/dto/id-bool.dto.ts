import { ApiProperty } from '@nestjs/swagger';

export class IdBoolDTO {
  @ApiProperty()
  readonly id: string;
  @ApiProperty()
  readonly value: boolean;
}
