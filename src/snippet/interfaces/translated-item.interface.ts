import { Document } from 'mongoose';

export interface TranslatedItem extends Document {
  readonly from: string;
  readonly to: string;
  readonly text: string;
  readonly source: string;
}
