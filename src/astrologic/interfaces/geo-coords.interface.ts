import { Document } from 'mongoose';

export interface GeoCoords extends Document {
  readonly lat: number;
  readonly lng: number;
  readonly alt?: number;
}
