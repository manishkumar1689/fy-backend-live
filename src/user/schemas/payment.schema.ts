import * as mongoose from 'mongoose';

export const PaymentSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
  },
  plan: {
    type: String,
    required: true,
  },
  ref: {
    type: String,
    required: false,
  },
  amount: {
    type: Number,
    default: 0,
    required: true,
  },
  curr: {
    type: String,
    required: true,
    default: "BTC",
  },
  createdAt: { type: Date, default: Date.now },
});
