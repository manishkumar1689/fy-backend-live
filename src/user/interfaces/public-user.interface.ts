import { Document } from 'mongoose';
import { Geo } from './geo.interface';
import { Preference } from './preference.interface';

export interface PublicUser extends Document {
  readonly nickName: string;
  readonly identifier: string;
  readonly useragent: string;
  readonly active: boolean;
  readonly geo?: Geo;
  readonly gender: string;
  readonly preferences: Preference[];
  readonly dob: Date;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
