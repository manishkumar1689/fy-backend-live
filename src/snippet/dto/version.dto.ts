import { ApiProperty } from '@nestjs/swagger';

export class VersionDTO {
  @ApiProperty()
  readonly lang: string;

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly approved: boolean;

  @ApiProperty()
  readonly text: string;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
