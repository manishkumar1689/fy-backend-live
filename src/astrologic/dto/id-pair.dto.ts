import { ApiProperty } from '@nestjs/swagger';

export class IdPairDTO {
  @ApiProperty()
  readonly c1: string;

  @ApiProperty()
  readonly c2: string;
}
