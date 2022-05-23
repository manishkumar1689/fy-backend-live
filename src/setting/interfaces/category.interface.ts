import { Document } from 'mongoose';

export interface Category extends Document {
  readonly key: string;
  readonly name: string;
  readonly maxScore?: number;
}
