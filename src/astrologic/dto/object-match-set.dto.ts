import { ApiProperty } from '@nestjs/swagger';
import { ObjectMatchDTO } from './object-match.dto';

export class ObjectMatchSetDTO {
  @ApiProperty()
  readonly num: number;

  @ApiProperty()
  readonly items: ObjectMatchDTO[];
}
