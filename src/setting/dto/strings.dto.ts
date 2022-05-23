import { ApiProperty } from '@nestjs/swagger';

export class StringsDTO {
  @ApiProperty()
  readonly strings: string[];
}