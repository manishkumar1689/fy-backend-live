import { ApiProperty } from '@nestjs/swagger';
import { GeoDTO } from './geo.dto';
import { PreferenceDTO } from './preference.dto';

export class PublicUserDTO {
  @ApiProperty()
  readonly nickName: string;

  @ApiProperty()
  readonly identifier: string;

  @ApiProperty()
  readonly useragent: string;

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly geo?: GeoDTO;

  @ApiProperty()
  readonly preferences: PreferenceDTO[];

  @ApiProperty()
  readonly gender: string;

  @ApiProperty()
  readonly dob?: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
