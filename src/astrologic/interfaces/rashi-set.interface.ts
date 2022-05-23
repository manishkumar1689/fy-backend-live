import { Document } from 'mongoose';
import { Rashi } from './rashi.interface';

export interface RashiSet extends Document {
  readonly num: number;
  readonly items: Rashi[];
}
