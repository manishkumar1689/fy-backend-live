import { Document } from 'mongoose';
import { AltName } from './alt-name.interface';

export interface GeoName extends Document {
  readonly name: string;
  readonly fullName: string;
  readonly altNames: AltName[];
  readonly region: string;
  readonly country: string;
  readonly fcode: string;
  readonly lng: number;
  readonly lat: number;
  readonly pop: number;
}
