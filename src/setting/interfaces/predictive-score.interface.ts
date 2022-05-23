import { Document } from 'mongoose';

export interface PredictiveScore extends Document {
  readonly key: string;
  readonly name: string;
  readonly value: number;
  readonly maxScore: number;
}
