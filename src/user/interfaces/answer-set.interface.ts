import { Document } from 'mongoose';
import { Answer } from './answer.interface';

export interface AnswerSet extends Document {
  readonly user: string;
  readonly type: string;
  readonly answers: Answer[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
