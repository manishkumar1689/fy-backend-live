import * as mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
const { Mixed } = mongoose.Schema.Types;

export const FlagSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
    // user who assigns flag
  },
  targetUser: {
    type: ObjectId,
    required: true,
    ref: 'User',
    // user to whom flag a relates
  },
  key: {
    type: String,
    required: false,
    default: '',
    // two part category__subkey
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
    // whether the target user is active
  },
  type: {
    type: String,
    enum: [
      'boolean',
      'int',
      'double',
      'string',
      'text',
      'title_text',
      'array_string',
      'array_int',
      'array_double',
    ],
    default: '',
  },
  value: {
    type: Mixed,
    required: true,
    default: null,
  },
  isRating: {
    type: Boolean,
    default: false,
    // may be used for stats
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
