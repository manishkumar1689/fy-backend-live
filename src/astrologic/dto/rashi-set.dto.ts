import { ApiProperty } from '@nestjs/swagger';
import { RashiDTO } from './rashi.dto';

export class RashiSetDTO {
  @ApiProperty()
  readonly num: number;

  @ApiProperty()
  readonly items: RashiDTO[];
}
