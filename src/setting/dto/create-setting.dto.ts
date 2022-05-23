import { ApiProperty } from '@nestjs/swagger';

export class CreateSettingDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly value: any;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly notes: string;

  @ApiProperty()
  readonly weight: number;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
