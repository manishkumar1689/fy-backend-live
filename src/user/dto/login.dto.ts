import { ApiProperty } from '@nestjs/swagger';
import { GeoDTO } from './geo.dto';

export class LoginDTO {
  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly password: string;

  @ApiProperty()
  readonly deviceToken?: string;

  @ApiProperty()
  readonly geo?: GeoDTO;
}
