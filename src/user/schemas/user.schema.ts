import * as mongoose from 'mongoose';
/* import * as validator from 'validator'; */
import { StatusSchema } from './status.schema';
import { ProfileSchema } from './profile.schema';
import { GeoSchema } from './geo.schema';
import { PlacenameSchema } from './placename.schema';
import { PreferenceSchema } from './preference.schema';
import { ContactSchema } from './contact.schema';
import { SurveyResultsSchema } from './survey-results.schema';

export const UserSchema = new mongoose.Schema({
  fullName: String, // formal full name
  nickName: String, // display name, alias, stage name
  identifier: {
    type: String,
    required: true,
    unique: true,
    // identifier may not always be an email, but must unique
    // use client-side validation instead
    /* validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
    }, */
  },
  mode: {
    type: String,
    enum: ['local', 'google', 'facebook', 'astro-databank'],
    default: 'local',
  },
  password: {
    type: String,
    required: false,
  },
  roles: [String],
  geo: {
    type: GeoSchema,
    required: false,
  },
  coords: {
    type: [Number],
    required: false,
    default: [0, 0],
  },
  contacts: {
    type: [ContactSchema],
    required: false,
  },
  placenames: {
    type: [PlacenameSchema],
    default: [],
    required: false,
  },
  gender: {
    type: String,
    enum: ['f', 'm', '-', 'nb', 'tf', 'tm', 'o'],
    default: '-',
    required: false,
  },
  profiles: {
    type: [ProfileSchema],
    default: [],
    required: false,
  },
  preferences: {
    type: [PreferenceSchema],
    default: [],
    required: false,
  },
  surveys: {
    type: [SurveyResultsSchema],
    default: [],
    required: false,
  },
  preview: {
    type: String,
    required: false,
    default: '',
  },
  dob: { type: Date, default: null, required: false },
  pob: {
    type: String,
    required: false,
    default: '',
  },
  active: Boolean,
  test: Boolean,
  boosts: { type: Number, required: false, default: 0 },
  status: [StatusSchema],
  deviceToken: {
    type: String,
    default: "",
    required: false,
  },
  token: String,
  likeStartTs: { type: Number, default: 0 },
  superlikeStartTs: { type: Number, default: 0 },
  login: { type: Date, default: null, required: false },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
