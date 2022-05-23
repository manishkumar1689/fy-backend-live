import * as mongoose from 'mongoose';

export const PredictiveScoreSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  maxScore: {
    type: Number,
    required: false,
    default: 0,
  },
});
