import * as mongoose from 'mongoose';
import { MediaItemSchema } from './media-item.schema';

export const ProfileSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['public', 'protected', 'private'],
    default: 'public',
  },
  text: {
    type: String,
    default: '',
  },
  mediaItems: {
    type: [MediaItemSchema],
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
