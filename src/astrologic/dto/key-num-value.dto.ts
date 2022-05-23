import { ApiProperty } from '@nestjs/swagger';

export class KeyNumValueDTO {
  @ApiProperty()
  readonly key: string;
  @ApiProperty()
  readonly value: number;
}
