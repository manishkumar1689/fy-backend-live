import { Document } from 'mongoose';

export interface KeyNumValue extends Document {
  readonly key: string;
  readonly value: number;
}
