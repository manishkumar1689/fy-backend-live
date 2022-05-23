import * as mongoose from 'mongoose';
import { KeyNumValueSchema } from './key-num-value.schema';

export const ProgressItemSchema = new mongoose.Schema({
  pd: {
    type: Number,
    required: true,
  },
  jd: {
    type: Number,
    required: true,
  },
  bodies: {
    type: [KeyNumValueSchema],
    required: true,
    default: [],
  },
  ayanamsha: {
    type: Number,
    required: true,
    default: 0,
  },
});
