import { ApiProperty } from '@nestjs/swagger';
import { GeoDTO } from './geo.dto';

export class PlacenameDTO {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly fullName: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly geo: GeoDTO;
}
