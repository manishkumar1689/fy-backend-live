/*
prefixes
num: muhurta
quality: guna

dict key: muhurta + '__' + num
*/

const muhurtaValues = [
  /* duration from sunrise to next sunrise / 30. same order every day */
  { num: 1, quality: 'm', exDays: [] },
  { num: 2, quality: 'm', exDays: [] },
  { num: 3, quality: 'b', exDays: [] },
  { num: 4, quality: 'm', exDays: [] },
  { num: 5, quality: 'b', exDays: [] },
  { num: 6, quality: 'b', exDays: [] },
  { num: 7, quality: 'b', exDays: [] },
  { num: 8, quality: 'b', exDays: [1, 5] },
  { num: 9, quality: 'b', exDays: [] },
  { num: 10, quality: 'm', exDays: [] },
  { num: 11, quality: 'm', exDays: [] },
  { num: 12, quality: 'm', exDays: [] },
  { num: 13, quality: 'b', exDays: [] },
  { num: 14, quality: 'b', exDays: [0] },
  { num: 15, quality: 'm', exDays: [] },
  { num: 16, quality: 'm', exDays: [] },
  { num: 17, quality: 'm', exDays: [] },
  { num: 18, quality: 'b', exDays: [] },
  { num: 19, quality: 'b', exDays: [] },
  { num: 20, quality: 'b', exDays: [] },
  { num: 21, quality: 'm', exDays: [] },
  { num: 22, quality: 'b', exDays: [] },
  { num: 23, quality: 'b', exDays: [] },
  { num: 24, quality: 'b', exDays: [] },
  { num: 25, quality: 'b', exDays: [] },
  { num: 26, quality: 'b', exDays: [] },
  { num: 27, quality: 'b', exDays: [] },
  { num: 28, quality: 'b', exDays: [] },
  { num: 29, quality: 'b', exDays: [] },
  { num: 30, quality: 'b', exDays: [] },
];

export default muhurtaValues;
