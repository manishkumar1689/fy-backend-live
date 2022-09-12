import * as mongoose from 'mongoose';
import { MediaItemSchema } from '../../user/schemas/media-item.schema';
const { ObjectId } = mongoose.Schema.Types;

export const FeedbackSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  targetUser: {
    type: ObjectId,
    required: false,
    ref: 'User',
  },
  key: {
    type: String,
    required: false,
    default: '',
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
  text: {
    type: String,
    required: true,
    default: '',
  },
  deviceDetails: {
    type: String,
    required: false,
    default: '',
  },
  mediaItems: {
    type: [MediaItemSchema],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
