import * as mongoose from 'mongoose';

export const KeyPairValueSchema = new mongoose.Schema({
  k1: {
    type: String,
    required: true,
  },
  k2: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
});
