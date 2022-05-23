/*
prefixes:
tithi key: tithi__ + num
div: tithi_type_ + div
*/

import { relativeAngle } from "../core";

const tithiValues = [
  { num: 1, lord: 'su', div: 1 },
  { num: 2, lord: 'mo', div: 2 },
  { num: 3, lord: 'ma', div: 3 },
  { num: 4, lord: 'me', div: 4 },
  { num: 5, lord: 'ju', div: 5 },
  { num: 6, lord: 've', div: 1 },
  { num: 7, lord: 'sa', div: 2 },
  { num: 8, lord: 'ra', div: 3 },
  { num: 9, lord: 'su', div: 4 },
  { num: 10, lord: 'mo', div: 5 },
  { num: 11, lord: 'ma', div: 1 },
  { num: 12, lord: 'me', div: 2 },
  { num: 13, lord: 'ju', div: 3 },
  { num: 14, lord: 've', div: 4 },
  { num: 15, lord: 'sa', div: 5 },
  { num: 16, lord: 'su', div: 1 },
  { num: 17, lord: 'mo', div: 2 },
  { num: 18, lord: 'ma', div: 3 },
  { num: 19, lord: 'me', div: 4 },
  { num: 20, lord: 'ju', div: 5 },
  { num: 21, lord: 've', div: 1 },
  { num: 22, lord: 'sa', div: 2 },
  { num: 23, lord: 'ra', div: 3 },
  { num: 24, lord: 'su', div: 4 },
  { num: 25, lord: 'mo', div: 5 },
  { num: 26, lord: 'ma', div: 1 },
  { num: 27, lord: 'me', div: 2 },
  { num: 28, lord: 'ju', div: 3 },
  { num: 29, lord: 've', div: 4 },
  { num: 30, lord: 'ra', div: 5 },
];



export const calcTithi = (sunLng = 0, moonLng = 0) => {
  const sunMoonAngle = relativeAngle(sunLng, moonLng);
  const tithiVal = sunMoonAngle / (360 / 30);
  //const sn = (moonLng + 360 - sunLng) % 360;
  const tithiPercent = (tithiVal % 1) * 100;
  const tithiNum = Math.floor(tithiVal) + 1;
  const tithiRow = tithiValues.find(t => t.num === tithiNum);
  const phase = Math.floor(sunMoonAngle / 90) + 1;
  return {
  ...tithiRow,
  ruler: tithiRow.lord,
  value: tithiVal,
  percent: tithiPercent,
  waxing: sunMoonAngle > 180,
  overHalfLight: [2,3].includes(phase),
  phase,
  };
}

export default tithiValues;
