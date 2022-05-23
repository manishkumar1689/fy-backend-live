import * as mongoose from 'mongoose';

export const TranslatedItemSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    default: 'en',
  },
  to: {
    type: String,
    required: true,
    default: 'hi',
  },
  source: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});
