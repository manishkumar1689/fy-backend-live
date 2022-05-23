import * as mongoose from 'mongoose';

export const BodySpeedSchema = new mongoose.Schema({
  jd: {
    type: Number,
    required: true,
  },
  datetime: {
    type: Date,
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
  speed: {
    type: Number,
    required: false,
  },
  acceleration: {
    type: Number,
    required: false,
  },
  station: {
    type: String,
    enum: ['sample', 'peak', 'retro-start', 'retro-peak', 'retro-end'],
  },
});
