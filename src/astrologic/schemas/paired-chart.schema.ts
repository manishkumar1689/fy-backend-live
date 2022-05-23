import * as mongoose from 'mongoose';
import { BaseChartSchema } from './base-chart.schema';
import { TagSchema } from './tag.schema';
import { GeoSchema } from '../../user/schemas/geo.schema';
import { KutaSetSchema } from './kuta-set.schema';
import { KeyPairValueSchema } from './key-pair-value.schema';

const { ObjectId } = mongoose.Schema.Types;

export const PairedChartSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  c1: {
    type: ObjectId,
    required: true,
    ref: 'Chart',
  },
  c2: {
    type: ObjectId,
    required: true,
    ref: 'Chart',
  },
  status: {
    type: String,
    enum: ['user', 'suggested', 'reference', 'keep'],
    required: false,
    default: 'suggested',
  },
  timespace: {
    type: BaseChartSchema,
    required: false,
  },
  surfaceGeo: {
    type: GeoSchema,
    required: false,
  },
  surfaceAscendant: {
    type: Number,
    required: false,
  },
  surfaceTzOffset: {
    type: Number,
    required: false,
  },
  midMode: {
    type: String,
    default: 'median',
  },
  relType: {
    type: String,
    required: false,
    default: '',
  },
  tags: {
    type: [TagSchema],
    required: false,
    default: [],
  },
  startYear: {
    // approx
    type: Number,
    required: false,
    default: 0,
  },
  endYear: {
    // approx
    type: Number,
    required: false,
    default: -1,
  },
  span: {
    // Length of relation in years, fractions for approx months, weeks etc.
    type: Number,
    required: false,
    default: 0,
  },
  aspects: {
    type: [KeyPairValueSchema],
    required: false,
    default: [],
  },
  kutas: {
    type: [KutaSetSchema],
    required: false,
    default: [],
  },
  notes: {
    type: String,
    required: false,
    default: '',
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  modifiedAt: {
    type: Date,
    default: new Date(),
  },
});
