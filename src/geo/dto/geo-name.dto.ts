import { ApiProperty } from '@nestjs/swagger';
import { AltNameDTO } from './alt-name.dto';

export class GeoNameDTO {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly fullName: string;

  @ApiProperty()
  readonly altNames: AltNameDTO[];

  @ApiProperty()
  readonly region: string;

  @ApiProperty()
  readonly country: string;

  @ApiProperty()
  readonly fcode: string;

  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly lat: number;

  @ApiProperty()
  readonly pop: number;
}
