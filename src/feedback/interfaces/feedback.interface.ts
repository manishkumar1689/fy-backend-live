import { Document } from 'mongoose';

export interface Feedback extends Document {
  readonly user: string;
  readonly targetUser: any;
  readonly key: string;
  readonly active: boolean;
  readonly type: string;
  readonly value: any;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
