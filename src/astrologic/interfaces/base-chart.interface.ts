import { Document } from 'mongoose';
import { Geo } from '../../user/interfaces/geo.interface';
import { BaseGraha } from './base-graha.interface';
import { HouseSystem } from './house-system.interface';
import { ITime } from './i-time.interface';
import { KeyNumValue } from './key-num-value.interface';
import { VariantSet } from './variant-set.interface';
import { ObjectMatchSet } from './object-match-set.interface';

export interface BaseChart extends Document {
  readonly datetime: Date;
  readonly jd: number;
  readonly geo: Geo;
  readonly tz: string;
  readonly tzOffset: number;
  readonly ascendant: number;
  readonly mc: number;
  readonly vertex: number;
  readonly grahas: BaseGraha[];
  readonly houses: HouseSystem[];
  readonly indianTime: ITime;
  readonly ayanamshas: KeyNumValue[];
  readonly upagrahas: KeyNumValue[];
  readonly sphutas: VariantSet[];
  readonly numValues: KeyNumValue[];
  readonly objects: ObjectMatchSet[];
}
