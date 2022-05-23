import { ApiProperty } from '@nestjs/swagger';

export class GrahaTransitionDTO {
  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly jd: number;

  @ApiProperty()
  readonly datetime?: Date;
}
