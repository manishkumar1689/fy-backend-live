import * as mongoose from 'mongoose';

export const HouseSystemSchema = new mongoose.Schema({
  system: {
    type: String,
    required: true,
    default: 'W',
  },
  values: {
    type: [Number],
    required: true,
  },
});
