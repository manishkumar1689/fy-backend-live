import * as mongoose from 'mongoose';
import { GrahaTransitionSchema } from './graha-transition.schema';
import { LngLatSchema } from './lng-lat.schema';
import { VariantSchema } from './variant.schema';

export const BaseGrahaSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  num: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  lat: {
    type: Number,
    required: false,
  },
  topo: {
    type: LngLatSchema,
    required: false,
  },
  lngSpeed: {
    type: Number,
    required: false,
  },
  declination: {
    type: Number,
    required: false,
  },
  variants: {
    type: [VariantSchema],
    default: [],
  },
  transitions: {
    type: [GrahaTransitionSchema],
    required: false,
    default: [],
  },
});
