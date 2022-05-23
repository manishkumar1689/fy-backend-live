import { Document } from 'mongoose';

export interface Tag extends Document {
  readonly slug: string;
  readonly name: string;
  readonly vocab?: string;
}
