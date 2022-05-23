import * as mongoose from 'mongoose';
import { VersionSchema } from './version.schema';

export const SnippetSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  published: {
    type: Boolean,
    default: false,
  },
  values: {
    type: [VersionSchema],
    required: true,
  },
  notes: {
    type: String,
    required: false,
    default: '',
  },
  format: {
    type: String,
    enum: ['text', 'html'],
    default: 'text',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
