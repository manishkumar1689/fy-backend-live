import * as mongoose from 'mongoose';

export const AnswerSchema = new mongoose.Schema({
  key: { type: String, default: '', required: true },
  value: { type: Number, default: 0, required: true },
  domain: { type: String, default: '', required: true },
  subdomain: { type: Number, required: false },
});
