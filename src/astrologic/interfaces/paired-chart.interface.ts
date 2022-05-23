import { Document } from 'mongoose';
import { BaseChart } from './base-chart.interface';
import { Tag } from './tag.interface';
import { Geo } from '../../user/interfaces/geo.interface';
import { KutaSet } from './kuta-set.interface';
import { KeyPairValue } from './key-pair-value.interface';

export interface PairedChart extends Document {
  readonly user: string;
  readonly c1: string;
  readonly c2: string;
  readonly status?: string;
  readonly timespace: BaseChart;
  readonly surfaceGeo: Geo;
  readonly surfaceAscendant: number;
  readonly surfaceTzOffset: number;
  readonly midMode: string;
  readonly relType: string;
  readonly tags: Tag[];
  readonly startYear?: number;
  readonly endYear?: number;
  readonly span?: number;
  readonly aspects: KeyPairValue[];
  readonly kutas: KutaSet[];
  readonly notes: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
