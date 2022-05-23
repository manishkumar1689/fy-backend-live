import * as mongoose from 'mongoose';
import { KeyNumValueSchema } from './key-num-value.schema';

export const KutaSetSchema = new mongoose.Schema({
  k1: {
    type: String,
    required: true,
  },
  k2: {
    type: String,
    required: true,
  },
  values: {
    type: [KeyNumValueSchema],
    required: true,
    default: [],
  },
});
