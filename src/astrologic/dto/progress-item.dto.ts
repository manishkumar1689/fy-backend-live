import { ApiProperty } from '@nestjs/swagger';
import { KeyNumValueDTO } from './key-num-value.dto';

export class ProgressItemDTO {
  @ApiProperty()
  readonly pd: number;

  @ApiProperty()
  readonly jd: number;

  @ApiProperty()
  readonly bodies: KeyNumValueDTO[];

  @ApiProperty()
  readonly ayanamsha: number;
}
