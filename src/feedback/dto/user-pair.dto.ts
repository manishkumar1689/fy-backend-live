import { ApiProperty } from '@nestjs/swagger';

export class UserPairDTO {
  @ApiProperty()
  readonly from: string;

  @ApiProperty()
  readonly to: string;
}
