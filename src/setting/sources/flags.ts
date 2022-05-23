const flags = [
  { key: 'like', type: 'boolean' },
  { key: 'wink', type: 'boolean' },
  { key: 'no_winking', type: 'boolean' },
  { key: 'view_protected', type: 'boolean' },
  { key: 'view_private', type: 'boolean' },
  { key: 'may_chat', type: 'boolean' },
  { key: 'is_abusive', type: 'boolean' },
  { key: 'reported', type: 'boolean' },
];

const ratings = [
  { key: 'looks', type: 'double', defaultValue: 3, range: [0, 5] },
  { key: 'character', type: 'double', defaultValue: 3, range: [0, 5] },
];

const expandFlag = flag => {
  return { ...flag, defaultValue: false, isRating: false };
};

const expandRating = flag => {
  return { ...flag, isRating: true };
};

export default [...flags.map(expandFlag), ...ratings.map(expandRating)];
