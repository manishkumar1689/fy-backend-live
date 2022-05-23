import { Document } from 'mongoose';

export interface Subject extends Document {
  readonly name: string;
  readonly notes?: string;
  readonly type: string;
  readonly gender: string;
  readonly eventType: string;
  readonly roddenValue?: number;
  readonly roddenScale?: string;
  readonly altNames?: string[];
  readonly sources?: string[];
}
