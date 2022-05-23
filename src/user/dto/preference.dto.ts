import { ApiProperty } from '@nestjs/swagger';

export class PreferenceDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly value: any;

  @ApiProperty()
  readonly type?: string;
}
