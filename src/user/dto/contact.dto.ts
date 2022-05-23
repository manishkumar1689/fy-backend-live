import { ApiProperty } from '@nestjs/swagger';

export class ContactDTO {
  @ApiProperty()
  readonly mode: string;

  @ApiProperty()
  readonly identifier: string;

  @ApiProperty()
  readonly type: string;
}
