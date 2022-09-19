import { ApiProperty } from '@nestjs/swagger';
import { StatusDTO } from './status.dto';
import { GeoDTO } from './geo.dto';
import { PlacenameDTO } from './placename.dto';
import { ProfileDTO } from './profile.dto';
import { PreferenceDTO } from './preference.dto';
import { ContactDTO } from './contact.dto';
import { SurveyResultsDTO } from './survey-results.dto';

export class CreateUserDTO {
  @ApiProperty()
  readonly fullName: string;

  @ApiProperty()
  readonly nickName: string;

  @ApiProperty()
  readonly identifier: string;

  @ApiProperty()
  readonly socialId?: string;

  @ApiProperty()
  readonly password: string;

  @ApiProperty()
  readonly oldPassword?: string;

  @ApiProperty()
  readonly mode: string;

  @ApiProperty()
  readonly roles: string[];

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly test: boolean;

  @ApiProperty()
  readonly boosts: number;

  @ApiProperty()
  readonly status: StatusDTO[];

  @ApiProperty()
  readonly geo?: GeoDTO;

  @ApiProperty()
  readonly coords?: number[];

  @ApiProperty()
  readonly contacts?: ContactDTO[];

  @ApiProperty()
  readonly placenames?: PlacenameDTO[];

  @ApiProperty()
  readonly preferences: PreferenceDTO[];

  @ApiProperty()
  readonly surveys: SurveyResultsDTO[];

  @ApiProperty()
  readonly profiles: ProfileDTO[];

  @ApiProperty()
  readonly preview: string;

  @ApiProperty()
  readonly publicProfileText?: string;

  @ApiProperty()
  readonly dob?: Date;

  @ApiProperty()
  readonly pob?: string;

  @ApiProperty()
  readonly token: string;

  @ApiProperty()
  readonly deviceToken?: string;

  @ApiProperty()
  readonly likeStartTs?: number;

  @ApiProperty()
  readonly superlikeStartTs?: number;

  @ApiProperty()
  readonly login: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;

  /* admin user id */
  @ApiProperty()
  readonly admin?: string;
}
