import * as mongoose from 'mongoose';

export const TranslationSchema = new mongoose.Schema({
  lang: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['standard', 'full', 'translit', 'short', 'numeric', 'variant'],
    default: 'standard',
  },
  alpha: {
    type: String,
    enum: ['lt', 'dv', 'cy'],
    default: 'lt',
  },
});
