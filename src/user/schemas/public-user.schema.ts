import * as mongoose from 'mongoose';
import { GeoSchema } from './geo.schema';
import { PreferenceSchema } from './preference.schema';
const { ObjectId } = mongoose.Schema.Types;

export const PublicUserSchema = new mongoose.Schema({
  nickName: String, // display name, alias, stage name
  identifier: {
    type: String,
    required: true,
    unique: false, // unlike managed users, this key is not unique
  },
  // The _id of the related birth chart if the eventType is anything other than birth
  parent: {
    type: ObjectId,
    required: false,
    ref: 'PublicUser', // if populated this is a child record of its parent
  },
  useragent: {
    type: String,
    required: false,
  },
  geo: {
    type: GeoSchema,
    required: false,
  },
  dob: { type: Date, default: null, required: false },
  gender: {
    type: String,
    enum: ['f', 'm', '-', 'nb', 'tf', 'tm', 'o'],
    default: '-',
    required: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  preferences: {
    type: [PreferenceSchema],
    default: [],
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
