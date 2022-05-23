import { ApiProperty } from '@nestjs/swagger';

export class ObjectMatchDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly value: string | string[];

  @ApiProperty()
  readonly refVal?: number;
}
