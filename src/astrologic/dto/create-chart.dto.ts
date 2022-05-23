import { ApiProperty } from '@nestjs/swagger';
import { SubjectDTO } from './subject.dto';
import { PlacenameDTO } from '../../user/dto/placename.dto';
import { GeoDTO } from '../../user/dto/geo.dto';
import { BaseGrahaDTO } from './base-graha.dto';
import { HouseSystemDTO } from './house-system.dto';
import { ITimeDTO } from './i-time.dto';
import { KeyNumValueDTO } from './key-num-value.dto';
import { VariantSetDTO } from './variant-set.dto';
import { ObjectMatchSetDTO } from './object-match-set.dto';
import { StringValueDTO } from './string-value.dto';
import { ProgressItemDTO } from './progress-item.dto';
import { RashiDTO } from './rashi.dto';

export class CreateChartDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly isDefaultBirthChart: boolean;

  @ApiProperty()
  readonly subject: SubjectDTO;

  @ApiProperty()
  readonly status?: string;

  @ApiProperty()
  readonly parent?: string;

  @ApiProperty()
  readonly datetime: Date;

  @ApiProperty()
  readonly jd: number;

  @ApiProperty()
  readonly geo: GeoDTO;

  @ApiProperty()
  readonly placenames: PlacenameDTO[];

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
  upagrahas?: KeyNumValueDTO[];

  @ApiProperty()
  sphutas?: VariantSetDTO[];

  @ApiProperty()
  numValues?: Array<KeyNumValueDTO>;

  @ApiProperty()
  stringValues?: StringValueDTO[];

  @ApiProperty()
  objects?: ObjectMatchSetDTO[];

  @ApiProperty()
  rashis?: RashiDTO[];

  @ApiProperty()
  readonly progressItems?: ProgressItemDTO[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
