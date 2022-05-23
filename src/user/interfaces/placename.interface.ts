import { Document } from 'mongoose';
import { Geo } from './geo.interface';

export interface Placename extends Document {
  readonly name: string;
  readonly fullName: string;
  readonly type: string;
  readonly geo: Geo;
}
