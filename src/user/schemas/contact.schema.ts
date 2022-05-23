import * as mongoose from 'mongoose';

export const ContactSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['tel', 'email', 'web', 'facebook', 'telegram'],
    default: 'public',
  },
  identifier: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['public', 'protected', 'private'],
    default: 'protected',
  },
});
