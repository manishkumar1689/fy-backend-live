import { Document } from 'mongoose';
import { Translation } from './translation.interface';

export interface Lexeme extends Document {
  readonly key: string;
  readonly name: string;
  readonly original: string;
  readonly unicode: string;
  readonly lang: string;
  readonly translations: Translation[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
