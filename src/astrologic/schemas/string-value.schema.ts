import * as mongoose from 'mongoose';

export const StringValueSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});
