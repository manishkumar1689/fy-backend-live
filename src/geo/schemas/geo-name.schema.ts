import * as mongoose from 'mongoose';
import { AltNameSchema } from './alt-name.schema';

export const GeoNameSchema = new mongoose.Schema({
  name: {
    type: String, // short name searched
    required: true,
  },
  fullName: {
    type: String, // long name
    required: true,
  },
  altNames: {
    type: [AltNameSchema],
    required: false,
    default: [],
  },
  region: {
    type: String,
    required: false,
    default: '',
  },
  country: {
    type: String,
    required: true,
    default: '',
  },
  fcode: {
    type: String,
    required: true,
    default: '',
  },
  lat: {
    type: Number,
    required: true,
    default: 0,
  },
  lng: {
    type: Number,
    required: true,
    default: 0,
  },
  pop: {
    type: Number,
    required: false,
    default: -1,
  },
});
