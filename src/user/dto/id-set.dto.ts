import { ApiProperty } from '@nestjs/swagger';

export class IdSetDTO {
  @ApiProperty()
  readonly uids: string[];

  @ApiProperty()
  readonly userID: string;
}
