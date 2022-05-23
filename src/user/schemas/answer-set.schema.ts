import * as mongoose from 'mongoose';
import { AnswerSchema } from './answer.schema';
const { ObjectId } = mongoose.Schema.Types;

export const AnswerSetSchema = new mongoose.Schema({
  // The _id of the related birth chart if the eventType is anything other than birth
  user: {
    type: ObjectId,
    required: false,
    ref: 'User', // if populated this is a child record of its parent
  },
  type: {
    type: String,
    required: false,
  },
  answers: { type: [AnswerSchema], default: [], required: true },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
