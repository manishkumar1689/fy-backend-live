import { ApiProperty } from '@nestjs/swagger';

export class AltNameDTO {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly lang: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly weight: number;
}
