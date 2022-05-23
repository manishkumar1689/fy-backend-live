import * as mongoose from 'mongoose';
const { Mixed } = mongoose.Schema.Types;

export const SurveyItemSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  multiscales: {
    type: String,
    required: false,
    enum: ['', 'big5', 'jungian'],
  },
  type: {
    type: String,
    required: false,
    enum: ['preferences', 'psychometric', 'feedback'],
  },
  enabled: {
    type: Boolean,
    required: true,
  },
});
