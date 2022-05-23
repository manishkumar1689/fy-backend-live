import { Document } from 'mongoose';
import { PredictiveScore } from './predictive-score.interface';

export interface PredictiveRuleSet extends Document {
  readonly user: string;
  readonly active: boolean;
  readonly type: string;
  readonly name: string;
  readonly text: string;
  readonly notes?: string;
  readonly conditionSet: any;
  readonly scores: PredictiveScore[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
