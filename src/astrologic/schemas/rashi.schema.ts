import * as mongoose from 'mongoose';

export const RashiSchema = new mongoose.Schema({
  houseNum: {
    type: Number,
    required: true,
  },
  sign: {
    type: Number,
    required: true,
  },
  lordInHouse: {
    type: Number,
    required: false,
  },
  arudhaInHouse: {
    type: Number,
    required: true,
  },
  arudhaInSign: {
    type: Number,
    required: false,
  },
  arudhaLord: {
    type: String,
    required: false,
  },
});
