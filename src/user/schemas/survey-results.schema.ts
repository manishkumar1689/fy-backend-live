import * as mongoose from 'mongoose';
import { ResultValueSchema } from './result-value.schema';

export const SurveyResultsSchema = new mongoose.Schema({
  type: { type: String, default: '', required: true },
  values: { type: [ResultValueSchema], default: [], required: true },
});
