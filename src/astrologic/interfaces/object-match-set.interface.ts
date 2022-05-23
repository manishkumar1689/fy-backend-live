import { Document } from 'mongoose';
import { ObjectMatch } from './object-match.interface';

export interface ObjectMatchSet extends Document {
  readonly num: number;
  readonly items: ObjectMatch[];
}
