import { Document } from 'mongoose';
import { Version } from './version.interface';

export interface Snippet extends Document {
  readonly key: string;
  readonly published: boolean;
  values: Version[];
  readonly format: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
