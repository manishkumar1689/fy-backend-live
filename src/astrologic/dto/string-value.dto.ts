import { ApiProperty } from '@nestjs/swagger';

export class StringValueDTO {
  @ApiProperty()
  readonly key: string;
  @ApiProperty()
  readonly value: string;
}
