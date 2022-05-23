import * as mongoose from 'mongoose';
const { Mixed } = mongoose.Schema.Types;

export const ObjectMatchSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    default: 'graha',
  },
  value: {
    type: Mixed,
    required: true,
  },
  refVal: {
    type: Number,
    required: false,
  },
});
