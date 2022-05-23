import * as mongoose from 'mongoose';
import { ObjectMatchSchema } from './object-match.schema';

export const ObjectMatchSetSchema = new mongoose.Schema({
  num: {
    type: Number,
    required: true,
  },
  items: {
    type: [ObjectMatchSchema],
    required: true,
    default: [],
  },
});
