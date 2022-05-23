import { Document } from 'mongoose';

export interface Translation extends Document {
  readonly lang: string;
  readonly text: string;
  readonly type: string;
  readonly alpha: string;
}
