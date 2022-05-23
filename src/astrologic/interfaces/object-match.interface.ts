import { Document } from 'mongoose';

export interface ObjectMatch extends Document {
  readonly key: string;
  readonly type: string;
  readonly value: string | string[];
  readonly refVal?: number;
}
