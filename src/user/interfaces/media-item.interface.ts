import { Document } from 'mongoose';
import { Attributes } from './attributes.interface';

export interface MediaItem extends Document {
  readonly filename: string;
  readonly mime: string;
  readonly source: string;
  readonly size: number;
  readonly attributes: Attributes;
  readonly type: string;
  readonly title: string;
  readonly variants?: string[];
}
