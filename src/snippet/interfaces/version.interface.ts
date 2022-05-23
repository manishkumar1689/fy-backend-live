import { Document } from 'mongoose';

export interface Version extends Document {
  readonly lang: string;
  readonly active: boolean;
  readonly approved: boolean;
  readonly text: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
