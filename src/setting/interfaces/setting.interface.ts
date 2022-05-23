import { Document } from 'mongoose';

export interface Setting extends Document {
  readonly key: string;
  readonly value: any;
  readonly type: string;
  readonly notes?: string;
  readonly weight: number;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
