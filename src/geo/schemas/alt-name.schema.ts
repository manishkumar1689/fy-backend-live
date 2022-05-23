import * as mongoose from 'mongoose';

export const AltNameSchema = new mongoose.Schema({
  name: {
    type: String, // short name searched
    required: true,
  },
  lang: {
    type: String, // language code, if known
    required: true,
    default: 'xx',
  },
  type: {
    type: String,
    enum: ['full', 'partial', 'abbr', 'historic'],
    default: 'partial',
  },
  weight: {
    type: Number, // lower numbers given greater priority, higher numbers for rarer alternatives
    required: false,
    default: 0,
  },
});
