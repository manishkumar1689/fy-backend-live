import { Document } from 'mongoose';

export interface Rashi extends Document {
  readonly houseNum: number;
  readonly sign: number;
  readonly lordInHouse: number;
  readonly arudhaInHouse: number;
}
