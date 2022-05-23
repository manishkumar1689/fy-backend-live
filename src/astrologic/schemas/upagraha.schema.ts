import * as mongoose from 'mongoose';

export const KeyNumValueSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
});
