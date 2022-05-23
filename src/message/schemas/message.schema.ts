import * as mongoose from 'mongoose';

export const MessageSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  lang: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  fromName: {
    type: String,
    required: true,
  },
  fromMail: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
