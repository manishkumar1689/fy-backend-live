import { Document } from 'mongoose';

export interface Score extends Document {
  readonly key: string;
  readonly value: number;
}
