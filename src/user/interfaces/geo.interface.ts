import { Document } from 'mongoose';

export interface Geo extends Document {
  readonly lat: number;
  readonly lng: number;
  readonly alt?: number;
}
