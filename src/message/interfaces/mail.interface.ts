import { Document } from 'mongoose';

export interface Mail extends Document {
  readonly from: string;
  readonly fromName: string;
  readonly to: string;
  readonly toName: string;
  readonly subject: string;
  readonly html: string;
  // readonly text: string;
}