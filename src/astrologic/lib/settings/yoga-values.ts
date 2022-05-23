/*
prefixes:
dict key: yoga__ + num
bm:  + bm
*/

import { relativeAngle } from "../core";

const yogaValues = [
  { num: 1, ruler: 'sa', bm: 'm' },
  { num: 2, ruler: 'me', bm: 'b' },
  { num: 3, ruler: 'ke', bm: 'b' },
  { num: 4, ruler: 've', bm: 'b' },
  { num: 5, ruler: 'su', bm: 'b' },
  { num: 6, ruler: 'mo', bm: 'm' },
  { num: 7, ruler: 'ma', bm: 'b' },
  { num: 8, ruler: 'ra', bm: 'b' },
  { num: 9, ruler: 'ju', bm: 'm' },
  { num: 10, ruler: 'sa', bm: 'm' },
  { num: 11, ruler: 'me', bm: 'b' },
  { num: 12, ruler: 'ke', bm: 'b' },
  { num: 13, ruler: 've', bm: 'm' },
  { num: 14, ruler: 'su', bm: 'b' },
  { num: 15, ruler: 'mo', bm: 'm' },
  { num: 16, ruler: 'ma', bm: 'b' },
  { num: 17, ruler: 'ra', bm: 'm' },
  { num: 18, ruler: 'ju', bm: 'b' },
  { num: 19, ruler: 'sa', bm: 'm' },
  { num: 20, ruler: 'me', bm: 'b' },
  { num: 21, ruler: 'ke', bm: 'b' },
  { num: 22, ruler: 've', bm: 'b' },
  { num: 23, ruler: 'su', bm: 'b' },
  { num: 24, ruler: 'mo', bm: 'b' },
  { num: 25, ruler: 'ma', bm: 'b' },
  { num: 26, ruler: 'ra', bm: 'b' },
  { num: 27, ruler: 'ju', bm: 'm' },
];

export const calcYoga = (sunLng = 0, moonLng = 0) => {
  const numYogas = yogaValues.length;
  const yogaDeg = 360 / numYogas;
  const yogaVal = relativeAngle(sunLng, moonLng) / yogaDeg;
  const index = Math.floor(yogaVal) % numYogas;
  const yogaRow = yogaValues[index];
  const percent = (yogaVal % 1) * 100;
  return {
    ...yogaRow,
    index,
    percent,
  };
}

export default yogaValues;
