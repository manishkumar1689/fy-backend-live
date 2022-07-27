import * as mongoose from 'mongoose';
const { Mixed } = mongoose.Schema.Types;

export const PreferenceSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: Mixed,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'text', // plain text without options
      'uri', // plain text, but validated as a URI (not necessarily http, may be other schemas)
      'string', // key string stored, e.g. f/m for gender
      'code', // as above, but without a set of option, i.e. the code will be interpreted according to custom rules
      'integer', // number stored as integer
      'scale', // integer interpreted on a scale e.g. -2 to 2 for degree of agreement (with 0 being neutral)
      'key_scale', // set of keys which arbitary integer values on a custom scale
      'array_key_scale', // array of keys which arbitary scale values may be assigned
      'float', // double
      'currency', // double rounded to exactly 2 dec places
      'boolean', // true/false, yes/no
      'array_string', // any number of string options
      'array_text', // any number of plain text items without options
      'array_uris', // any number of uris
      'array_integer', // any number of integer options
      'range_number', // numeric range e.g 18-40 stored as [18,40]
      'array_float',
      'multiple_key_scales', // multiple scales defined by rules,
      'faceted', // scale but for big5 faceted
      'jungian', // scale but for jungian faceted
      'simple_astro_pair', // simplified astro chart pair with relationship data
    ],
    default: 'string',
    required: true,
  },
});
