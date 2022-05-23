import { ApiProperty } from '@nestjs/swagger';

export class EmailParamsDTO {
  @ApiProperty()
  to: string;
  @ApiProperty()
  toName?: string;
  @ApiProperty()
  from?: string;
  @ApiProperty()
  fromName?: string;
  @ApiProperty()
  subject: string;
  @ApiProperty()
  html: string;
}
