import { Document } from 'mongoose';

export interface ITime extends Document {
  readonly year: number;
  readonly dayNum: number;
  readonly progress: number;
  readonly dayLength: number;
  readonly isDayTime: boolean;
  readonly dayBefore: boolean;
  readonly muhurta: number;
  readonly ghati: number;
  readonly vighati: number;
  readonly lipta: number;
  readonly weekDayNum?: number;
}
