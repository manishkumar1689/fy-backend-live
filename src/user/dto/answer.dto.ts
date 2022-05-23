import { ApiProperty } from '@nestjs/swagger';

export class AnswerDTO {
  @ApiProperty()
  readonly key: string;
  @ApiProperty()
  readonly value: number;
  @ApiProperty()
  readonly domain: string;
  @ApiProperty()
  readonly subdomain: number;
}
