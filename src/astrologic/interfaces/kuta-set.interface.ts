import { Document } from 'mongoose';
import { KeyNumValue } from './key-num-value.interface';

export interface KutaSet extends Document {
  readonly k1: string;
  readonly k2: string;
  readonly values: KeyNumValue[];
}
