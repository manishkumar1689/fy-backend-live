/* Ancient Indian Time Units - starting from Sun-rise  */
const ghatiValues = [
  {
    key: '0',
    formula: {
      unit: 'dayLength',
      op: '/',
      operand: 30,
      description:
        '2 x ghaṭi -- - 30 muhūrtas in duration from SunRise to next day SunRise',
    },
  },
  {
    key: 'ghati',
    formula: {
      unit: 'dayLength',
      op: '/',
      operand: 60,
      description: '(duration from SunRise to SunRise (next day)) / 60',
    },
  },
  {
    key: 'vighati',
    formula: {
      unit: 'gh',
      op: '/',
      operand: 60,
      description: 'ghaṭi / 60',
    },
  },
  {
    key: 'lipta',
    formula: {
      unit: 'vi',
      op: '/',
      operand: 60,
      description: 'vighaṭi / 60',
    },
  },
];

export default ghatiValues;
