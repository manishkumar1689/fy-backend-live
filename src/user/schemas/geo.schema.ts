import * as mongoose from 'mongoose';

export const GeoSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  alt: {
    type: Number,
    required: false,
    default: 10,
  },
});
