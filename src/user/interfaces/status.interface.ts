import { Document } from 'mongoose';
import { Payment } from './payment.interface';

export interface Status extends Document {
  readonly role: string;
  readonly current: boolean;
  readonly payments?: Payment[];
  readonly reason?: string;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
  readonly modifiedAt: Date;
}
