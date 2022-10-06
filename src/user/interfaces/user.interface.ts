import { Document } from 'mongoose';
import { Status } from './status.interface';
import { Profile } from './profile.interface';
import { Placename } from './placename.interface';
import { Geo } from './geo.interface';
import { Preference } from './preference.interface';
import { Contact } from './contact.interface';
import { SurveyResults } from './survey-results.interface';

export interface User extends Document {
  readonly fullName: string;
  readonly nickName: string;
  readonly identifier: string;
  readonly socialId?: string;
  readonly password: string;
  readonly mode: string;
  readonly roles: string[];
  readonly active: boolean;
  readonly test: boolean;
  readonly boosts?: number;
  readonly status: Status[];
  readonly geo?: Geo;
  readonly coords?: number[];
  readonly contacts?: Contact[];
  readonly placenames?: Placename[];
  readonly gender: string;
  readonly preferences: Preference[];
  readonly surveys: SurveyResults[];
  readonly profiles: Profile[];
  readonly preview: string;
  readonly dob: Date;
  readonly pob?: string;
  readonly deviceToken: string; // dev legacy, remove
  readonly deviceTokens: string[];
  readonly token: string;
  readonly likeStartTs: number;
  readonly superlikeStartTs: number;
  readonly login: Date;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
