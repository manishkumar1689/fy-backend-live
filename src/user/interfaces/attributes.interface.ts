import { Document } from 'mongoose';

export interface Attributes extends Document {
  readonly width: number;
  readonly height: number;
  readonly orientation: number;
  readonly duration: number;
  readonly uploadDate: string;
  readonly preview: string;
}
