import * as mongoose from 'mongoose';

export const CategorySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  maxScore: {
    type: Number,
    required: false,
    default: 0,
  },
});
