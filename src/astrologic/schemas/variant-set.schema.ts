import * as mongoose from 'mongoose';
import { KeyNumValueSchema } from './upagraha.schema';
/*
 0 => Tropical
 27 => true_citra
 1 => lahiri
 5 => krishnamurti
*/
export const VariantSetSchema = new mongoose.Schema({
  num: {
    type: Number, // ayanamsha number, 0 = none applied
    required: true,
  },
  items: {
    type: [KeyNumValueSchema], //
    required: true,
  },
});
