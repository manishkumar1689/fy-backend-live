import { ApiProperty } from '@nestjs/swagger';
import { IdPairDTO } from './id-pair.dto';

export class PairsSetDTO {
  @ApiProperty()
  readonly pairs: IdPairDTO[];
}
