import { Document } from 'mongoose';

export interface Preference extends Document {
  readonly key: string;
  readonly value: any;
  readonly type?: string;
  multiscales?: string;
  range?: number[];
  enabled?: boolean;
}
