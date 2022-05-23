import { Document } from 'mongoose';

export interface ConfigOption extends Document {
  readonly key: string;

  readonly value: any;

  readonly type: string;
}
