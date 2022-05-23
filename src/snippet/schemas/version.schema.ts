import * as mongoose from 'mongoose';

export const VersionSchema = new mongoose.Schema({
  lang: {
    type: String,
    required: true,
    default: 'en-GB',
  },
  active: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
