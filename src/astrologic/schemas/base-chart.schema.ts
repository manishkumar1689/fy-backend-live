import * as mongoose from 'mongoose';
import { GeoSchema } from '../../user/schemas/geo.schema';
import { BaseGrahaSchema } from './base-graha.schema';
import { HouseSystemSchema } from './house-system.schema';
import { ITimeSchema } from './i-time.schema';
import { KeyNumValueSchema } from './upagraha.schema';
import { VariantSetSchema } from './variant-set.schema';
import { ObjectMatchSetSchema } from './object-match-set.schema';

export const BaseChartSchema = new mongoose.Schema({
  datetime: {
    type: Date,
    required: true,
  },
  jd: {
    type: Number,
    required: true,
  },
  geo: {
    type: GeoSchema,
    required: true,
  },
  tz: {
    type: String,
    required: false,
  },
  tzOffset: {
    type: Number,
    required: true,
  },
  ascendant: {
    type: String,
    required: false,
  },
  mc: {
    type: String,
    required: false,
  },
  vertex: {
    type: String,
    required: false,
  },
  grahas: {
    type: [BaseGrahaSchema],
    required: true,
  },
  houses: {
    type: [HouseSystemSchema],
    required: false,
  },
  indianTime: {
    type: ITimeSchema,
    required: false,
  },
  ayanamshas: {
    type: [KeyNumValueSchema],
    required: false,
    default: [],
  },
  upagrahas: {
    type: [KeyNumValueSchema],
    required: false,
    default: [],
  },
  sphutas: {
    type: [VariantSetSchema],
    required: false,
    default: [],
  },
  numValues: {
    type: [KeyNumValueSchema],
    required: false,
    default: [],
  },
  objects: {
    type: [ObjectMatchSetSchema],
    required: false,
    default: [],
  },
});
