import { ApiProperty } from '@nestjs/swagger';
import { KeyNumValueDTO } from './key-num-value.dto';

export class VariantSetDTO {
  @ApiProperty()
  readonly num: number; // ayanamsha ref number

  @ApiProperty()
  readonly items: KeyNumValueDTO[];
}
