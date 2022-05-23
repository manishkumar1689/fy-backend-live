import { Document } from 'mongoose';

export interface KeyPairValue extends Document {
  readonly k1: string;
  readonly k2: string;
  readonly value: number;
}
