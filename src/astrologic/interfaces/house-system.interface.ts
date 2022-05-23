import { Document } from 'mongoose';

export interface HouseSystem extends Document {
  readonly system: string;
  readonly values: Array<number>;
}
