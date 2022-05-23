import { Document } from 'mongoose';

export interface LngLat extends Document {
  readonly lng: number;
  readonly lat: number;
}
