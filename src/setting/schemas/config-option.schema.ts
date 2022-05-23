import * as mongoose from 'mongoose';
const { Mixed } = mongoose.Schema.Types;

export const ConfigOptionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: Mixed,
    required: true,
  },
  type: {
    type: String,
    default: 'string',
    enum: ['string', 'number', 'boolean', 'key_num_grid'],
  },
});
