import * as mongoose from 'mongoose';

export const LngLatSchema = new mongoose.Schema({
  lng: {
    type: Number,
    required: true,
    default: 0,
  },
  lat: {
    type: Number,
    required: true,
    default: 0,
  },
});
