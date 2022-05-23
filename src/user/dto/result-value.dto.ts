import { ApiProperty } from '@nestjs/swagger';

export class ResultValueDTO {
  @ApiProperty()
  readonly domain: string;
  @ApiProperty()
  readonly subdomain?: number;
  @ApiProperty()
  readonly value: number;
}
