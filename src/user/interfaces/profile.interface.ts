import { Document } from 'mongoose';
import { MediaItem } from './media-item.interface';

export interface Profile extends Document {
  readonly type: string;
  readonly text: string;
  readonly mediaItems: MediaItem[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
