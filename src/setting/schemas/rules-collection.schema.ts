import * as mongoose from 'mongoose';
import { CategorySchema } from './category.schema';
import { RuleSetSchema } from './rule-set.schema';
const { Mixed, ObjectId } = mongoose.Schema.Types;

export const RulesCollectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'rel_potential',
      'similarities',
      'mirroring',
      'synastry',
      'composite',
      'kutas',
      'dashas',
      'ashtavarga',
    ],
    required: true,
  },
  rules: {
    type: [RuleSetSchema],
  },
  percent: {
    type: Number,
    default: 0,
  },
});
