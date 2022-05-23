import { Document } from 'mongoose';

export interface Answer extends Document {
  readonly key: string;
  readonly value: number;
  readonly domain: string;
  readonly subdomain: number;
}
