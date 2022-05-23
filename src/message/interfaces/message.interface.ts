import { Document } from 'mongoose';

export interface Message extends Document {
  readonly key: string;
  readonly lang: string;
  readonly active: boolean;
  readonly subject: string;
  readonly body: string;
  readonly fromName: string;
  readonly fromMail: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
