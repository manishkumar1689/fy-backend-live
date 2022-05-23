import { ApiProperty } from '@nestjs/swagger';

export class ConfigOptionDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly value: any;

  @ApiProperty()
  readonly type: string;
}
