import { Document } from 'mongoose';
import { KeyNumValue } from './key-num-value.interface';

export interface VariantSet extends Document {
  readonly num: number; // ayanamsha ref number
  readonly items: KeyNumValue[];
}
