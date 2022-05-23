import { Document } from 'mongoose';
import { ResultValue } from './result-value.interface';

export interface SurveyResults extends Document {
  readonly type: string;
  readonly values: ResultValue[];
}
