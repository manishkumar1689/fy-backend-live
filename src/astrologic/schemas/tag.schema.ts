import * as mongoose from 'mongoose';

export const TagSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  vocab: {
    type: String,
    required: false,
    default: 'rel',
  },
});
