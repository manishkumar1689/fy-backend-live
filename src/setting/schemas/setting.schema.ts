import * as mongoose from 'mongoose';
const { Mixed } = mongoose.Schema.Types;

export const SettingSchema = new mongoose.Schema({
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
    enum: [
      'string',
      'date',
      'datetime',
      'integer',
      'float',
      'currency',
      'boolean',
      'array_string',
      'array_integer',
      'array_float',
      'payments',
      'preferences',
      'survey_list',
      'roles',
      'lookup_set',
      'languages',
      'flags',
      'rules',
      'device_version',
      'custom',
    ],
  },
  notes: {
    type: String,
    required: false,
  },
  weight: {
    type: Number,
    default: 0,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
