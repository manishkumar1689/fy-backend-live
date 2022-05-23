/*
prefixes:
vara key: vara__ + num
*/

import { ITime } from "../models/chart";

const varaValues = [
  { num: 1, ruler: 'su' },
  { num: 2, ruler: 'mo' },
  { num: 3, ruler: 'ma' },
  { num: 4, ruler: 'me' },
  { num: 5, ruler: 'ju' },
  { num: 6, ruler: 've' },
  { num: 7, ruler: 'sa' },
];

export const calcVara = (jd = 0, iTime: ITime, sunRise = null) => {
  const { dayLength, dayStart, weekDayNum } = iTime;
  const percent = ((jd - dayStart ) / dayLength) * 100;
  const weekDayIndex = (weekDayNum + varaValues.length - 1) % varaValues.length;
  const varaRow = varaValues[weekDayIndex];
  if (varaRow) {
    return {
      ...varaRow,
      sunRise,
      dayLength,
      percent,
    };
  }
}

export default varaValues;
