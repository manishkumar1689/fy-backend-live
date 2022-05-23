import * as mongoose from 'mongoose';

export const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: '',
  },
  notes: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    required: true,
    default: 'person',
  },
  gender: {
    type: String,
    required: true,
    default: '-',
  },
  eventType: {
    type: String,
    required: true,
    default: 'birth',
  },
  roddenValue: {
    type: Number,
    required: false,
  },
  roddenScale: {
    type: String,
    required: false,
  },
  altNames: {
    type: [String],
    required: false,
  },
  sources: {
    type: [String],
    required: false,
  },
});
