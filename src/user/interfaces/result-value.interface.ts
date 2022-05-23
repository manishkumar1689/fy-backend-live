import { Document } from 'mongoose';

export interface ResultValue extends Document {
  readonly domain: string;
  readonly subdomain: number;
  readonly value: number;
}
