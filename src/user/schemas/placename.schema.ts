import * as mongoose from 'mongoose';
import { GeoSchema } from './geo.schema';

export const PlacenameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: false,
    default: '',
  },
  type: {
    type: String,
    default: 0,
    required: true,
  },
  geo: {
    type: GeoSchema,
    required: true,
  },
});
