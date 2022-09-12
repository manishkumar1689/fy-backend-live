import { Document } from 'mongoose';
import { MediaItem } from '../../user/interfaces/media-item.interface';

export interface Feedback extends Document {
  readonly user: string;
  readonly targetUser?: string;
  readonly key: string;
  readonly active: boolean;
  readonly text: string;
  readonly deviceDetails?: string;
  readonly mediaItems?: MediaItem[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
