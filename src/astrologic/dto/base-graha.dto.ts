import { ApiProperty } from '@nestjs/swagger';
import { LngLatDTO } from './lng-lat.dto';
import { GrahaTransitionDTO } from './graha-transition.dto';
import { VariantDTO } from './variant.dto';

export class BaseGrahaDTO {
  @ApiProperty()
  readonly num: number;

  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly lat: number;

  @ApiProperty()
  readonly topo: LngLatDTO;

  @ApiProperty()
  readonly lngSpeed: number;

  @ApiProperty()
  readonly declination: number;

  @ApiProperty()
  readonly variants: VariantDTO[];

  @ApiProperty()
  readonly transitions: Array<GrahaTransitionDTO>;
}
