import { Document } from 'mongoose';
import { GrahaTransition } from './graha-transition.interface';
import { LngLat } from './lng-lat.interface';
import { Variant } from './variant.interface';

export interface BaseGraha extends Document {
  readonly key: string;
  readonly num: number;
  readonly lng: number;
  readonly lat: number;
  readonly topo: LngLat;
  readonly lngSpeed: number;
  readonly declination: number;
  readonly variants: Variant[];
  readonly transitions: Array<GrahaTransition>;
}
