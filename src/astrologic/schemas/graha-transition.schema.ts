import * as mongoose from 'mongoose';

export const GrahaTransitionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'rise',
      'set',
      'mc',
      'ic',
      'prevRise',
      'prevSet',
      'nextRise',
      'nextSet',
    ],
  },
  jd: {
    type: Number,
    required: true,
  },
  datetime: {
    type: Date,
    required: false,
  },
});
