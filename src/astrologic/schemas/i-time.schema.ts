import * as mongoose from 'mongoose';

export const ITimeSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  dayNum: {
    type: Number,
    required: true,
  },
  progress: {
    type: Number,
    required: true,
  },
  dayLength: {
    type: Number,
    required: true,
  },
  isDayTime: {
    type: Boolean,
    required: true,
  },
  dayBefore: {
    type: Boolean,
    required: false,
  },
  muhurta: {
    type: Number,
    required: true,
  },
  ghati: {
    type: Number,
    required: true,
  },
  vighati: {
    type: Number,
    required: true,
  },
  lipta: {
    type: Number,
    required: true,
  },
  weekDayNum: {
    type: Number,
    required: false,
  },
});
