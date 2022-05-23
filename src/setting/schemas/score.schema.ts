import * as mongoose from 'mongoose';

export const ScoreSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
});
