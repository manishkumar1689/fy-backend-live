import * as mongoose from 'mongoose';
import { ScoreSchema } from './score.schema';
const { Mixed } = mongoose.Schema.Types;

export const RuleSetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    required: false,
    default: '',
  },
  conditionSet: {
    type: Mixed,
    required: false,
  },
  scores: {
    type: [ScoreSchema],
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
