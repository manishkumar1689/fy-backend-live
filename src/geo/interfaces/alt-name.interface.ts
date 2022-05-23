import { Document } from 'mongoose';

export interface AltName extends Document {
  readonly name: string;
  readonly lang: string;
  readonly type: string;
  readonly weight: number;
}
