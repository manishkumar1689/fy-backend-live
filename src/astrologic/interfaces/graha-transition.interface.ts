import { Document } from 'mongoose';

export interface GrahaTransition extends Document {
  readonly type: string;
  readonly jd: number;
  readonly datetime?: Date;
}
