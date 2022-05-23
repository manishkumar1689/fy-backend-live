import { Document } from 'mongoose';
import { KeyNumValue } from './key-num-value.interface';

export interface ProgressItem extends Document {
  readonly pd: number;
  readonly jd: number;
  readonly bodies: KeyNumValue[];
  readonly ayanamsha: number;
}
