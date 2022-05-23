import * as mongoose from 'mongoose';
import { SubjectSchema } from './subject.schema';
import { GeoSchema } from '../../user/schemas/geo.schema';
import { PlacenameSchema } from '../../user/schemas/placename.schema';
import { BaseGrahaSchema } from './base-graha.schema';
import { HouseSystemSchema } from './house-system.schema';
import { ITimeSchema } from './i-time.schema';
import { KeyNumValueSchema } from './upagraha.schema';
import { VariantSetSchema } from './variant-set.schema';
import { ObjectMatchSetSchema } from './object-match-set.schema';
import { StringValueSchema } from './string-value.schema';
import { RashiSetSchema } from './rashi-set.schema';
import { ProgressItemSchema } from './progress-item.schema';
const { ObjectId } = mongoose.Schema.Types;

export const ChartSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  // If true, this the birth chart of the user who created it.
  isDefaultBirthChart: {
    type: Boolean,
    default: true,
  },
  subject: {
    type: SubjectSchema,
    required: true,
  },
  // helps decide whether to keep a chart record, member charts only contain one ayanamsha variant
  status: {
    type: String,
    enum: ['user', 'member', 'reference', 'keep', 'test'],
    required: false,
  },
  // The _id of the related birth chart if the eventType is anything other than birth
  parent: {
    type: ObjectId,
    required: false,
    ref: 'Chart',
  },
  // UTC datetime for easy reference. This usually differs from local time
  datetime: {
    type: Date,
    required: true,
  },
  // JD equivalent
  jd: {
    type: Number,
    required: true,
  },
  geo: {
    type: GeoSchema,
    required: true,
  },
  placenames: {
    type: [PlacenameSchema],
    required: false,
    default: [],
  },
  // correct timezone e.g Europe/Zurich. The short code is generated
  // NB the timezone may remain the same even if daylight saving rules change
  tz: {
    type: String,
    required: false,
  },
  // timezone offset in seconds
  tzOffset: {
    type: Number,
    required: true,
  },
  ascendant: {
    type: Number,
    required: false,
  },
  mc: {
    type: Number,
    required: false,
  },
  vertex: {
    type: Number,
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
  stringValues: {
    type: [StringValueSchema],
    required: false,
    default: [],
  },
  objects: {
    type: [ObjectMatchSetSchema],
    required: false,
    default: [],
  },
  rashis: {
    type: [RashiSetSchema],
    required: false,
    default: [],
  },
  progressItems: {
    type: [ProgressItemSchema],
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
