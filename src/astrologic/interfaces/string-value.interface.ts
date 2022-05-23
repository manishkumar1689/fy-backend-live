import { Document } from 'mongoose';

export interface StringValue extends Document {
  readonly key: string;
  readonly value: string;
}
