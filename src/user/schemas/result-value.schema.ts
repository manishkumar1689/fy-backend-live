import * as mongoose from 'mongoose';

export const ResultValueSchema = new mongoose.Schema({
  domain: { type: String, default: '', required: true },
  subdomain: { type: Number, default: 0, required: true },
  value: { type: Number, default: 0, required: true },
});
