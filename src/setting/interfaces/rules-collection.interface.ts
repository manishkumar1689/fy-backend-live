import { Document } from 'mongoose';
import { Category } from './category.interface';
import { RuleSet } from './rule-set.interface';

export interface RulesCollection extends Document {
  readonly type: string;
  readonly rules: RuleSet[];
  readonly percent: number;
}
