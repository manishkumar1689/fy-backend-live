import { Document } from 'mongoose';
import { Score } from './score.interface';

export interface RuleSet extends Document {
  readonly name: string;
  readonly notes: string;
  readonly conditionSet: any;
  readonly scores: Score[];
}
