import { ApiProperty } from '@nestjs/swagger';
import { GeoDTO } from '../../user/dto/geo.dto';
import { BaseGrahaDTO } from './base-graha.dto';
import { HouseSystemDTO } from './house-system.dto';
import { ITimeDTO } from './i-time.dto';
import { KeyNumValueDTO } from './key-num-value.dto';
import { VariantSetDTO } from './variant-set.dto';
import { ObjectMatchSetDTO } from './object-match-set.dto';

export class BaseChartDTO {
  @ApiProperty()
  readonly parent?: string;

  @ApiProperty()
  readonly datetime: Date;

  @ApiProperty()
  readonly jd: number;

  @ApiProperty()
  readonly geo: GeoDTO;

  @ApiProperty()
  readonly tz: string;

  @ApiProperty()
  readonly tzOffset: number;

  @ApiProperty()
  readonly ascendant: number;

  @ApiProperty()
  readonly mc: number;

  @ApiProperty()
  readonly vertex: number;

  @ApiProperty()
  readonly grahas: BaseGrahaDTO[];

  @ApiProperty()
  readonly houses: HouseSystemDTO[];

  @ApiProperty()
  readonly indianTime: ITimeDTO;

  @ApiProperty()
  readonly ayanamshas: KeyNumValueDTO[];

  @ApiProperty()
  upagrahas: KeyNumValueDTO[];

  @ApiProperty()
  sphutas: VariantSetDTO[];

  @ApiProperty()
  keyValues?: Array<KeyNumValueDTO>;

  @ApiProperty()
  objects: Array<ObjectMatchSetDTO>;
}
