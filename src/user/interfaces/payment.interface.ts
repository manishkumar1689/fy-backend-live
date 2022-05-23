import { Document } from 'mongoose';

export interface Payment extends Document {
  readonly service: string;
  readonly plan: string;
  readonly ref: string;
  readonly amount: number;
  readonly curr: string;
  readonly createdAt: Date;
}
