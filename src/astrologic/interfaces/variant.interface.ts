import { Document } from 'mongoose';

export interface Variant extends Document {
  readonly num: number; // ayanamsha ref number
  readonly sign?: number;
  readonly house?: number;
  readonly nakshatra?: number;
  readonly relationship: string;
  readonly charaKaraka?: string;
}
