import * as mongoose from 'mongoose';

export const AttributesSchema = new mongoose.Schema({
  width: {
    type: Number,
    required: false,
  },
  height: {
    type: Number,
    required: false,
  },
  orientation: {
    type: Number,
    required: false,
  },
  duration: {
    type: Number,
    required: false,
  },
  uploadDate: {
    type: String,
    required: false,
  },
  preview: {
    type: String,
    required: false,
  },
});
