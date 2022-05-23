import * as mongoose from 'mongoose';
import { AttributesSchema } from './attributes.schema';

export const MediaItemSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  mime: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    enum: ['local', 'vimeo', 'cloudinary'],
  },
  size: Number,
  attributes: {
    type: AttributesSchema,
    required: false,
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio'],
  },
  title: String,
  variants: {
    type: [String],
    default: [],
    required: false,
  },
});
