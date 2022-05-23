import * as mongoose from 'mongoose';
import charakarakaValues from '../lib/settings/charakaraka-values';
/*
-1 => Tropical
 27 => true_citra
 1 => lahiri
 5 => krishnamurti
*/
export const VariantSchema = new mongoose.Schema({
  num: {
    type: Number, // ayanamsha number, 0 = none applied
    required: true,
  },
  sign: {
    type: Number, //
    required: false,
  },
  house: {
    type: Number, //
    required: false,
  },
  nakshatra: {
    type: Number, //
    required: false,
  },
  relationship: {
    type: String,
    enum: [
      'archEnemy',
      'enemy',
      'neutral',
      'friend',
      'bestFriend',
      'ownSign',
      '',
    ],
    required: false,
  },
  charaKaraka: {
    type: Number,
    required: false,
    default: 0,
    // 'DK', 'GK', 'PK', 'PiK', 'MK', 'BK', 'AmK', 'AK'
  },
});
