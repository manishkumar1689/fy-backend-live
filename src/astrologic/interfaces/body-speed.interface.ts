import { Document } from 'mongoose';

export interface BodySpeed extends Document {
  readonly jd: number;
  readonly datetime: string;
  readonly num: number;
  readonly lng: number;
  readonly speed: number;
  readonly acceleration: number;
  readonly station: string;
}
