import * as mongoose from 'mongoose';
import { RashiSchema } from './rashi.schema';

export const RashiSetSchema = new mongoose.Schema({
  num: {
    type: Number,
    required: true,
  },
  items: {
    type: [RashiSchema],
    required: true,
    default: [],
  },
});
