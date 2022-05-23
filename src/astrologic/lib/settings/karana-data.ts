/*
prefixes: 
num: karana
bm: guna
type: karana
deity: devata
*/

import { relativeAngle } from "../core";
import { KaranaSet } from "../models/karana-set";

const karanaData = {
  karanas: [
    {
      num: 1,
      ruler: 'su',
      locations: [2, 9, 16, 23, 30, 37, 44, 51],
      bm: 'b',
      type: 'mov',
      deity: 'indra',
    },
    {
      num: 2,
      ruler: 'mo',
      locations: [3, 10, 17, 24, 31, 38, 45, 52],
      bm: 'b',
      type: 'mov',
      deity: 'brahma',
    },
    {
      num: 3,
      ruler: 'ma',
      locations: [4, 11, 18, 25, 32, 39, 46, 53],
      bm: 'b',
      type: 'mov',
      deity: 'mitra',
    },
    {
      num: 4,
      ruler: 'me',
      locations: [5, 12, 19, 26, 33, 40, 47, 54],
      bm: 'b',
      type: 'mov',
      deity: 'vishvakarma',
    },
    {
      num: 5,
      ruler: 'ju',
      locations: [6, 13, 20, 27, 34, 41, 48, 55],
      bm: 'b',
      type: 'mov',
      deity: 'bhumi',
    },
    {
      num: 6,
      ruler: 've',
      locations: [7, 14, 21, 28, 35, 42, 49, 56],
      bm: 'b',
      type: 'mov',
      deity: 'lakshmi',
    },
    {
      num: 7,
      ruler: 'sa',
      locations: [8, 15, 22, 29, 36, 43, 50, 57],
      bm: 'm',
      type: 'mov',
      deity: 'yama',
    },
    {
      num: 8,
      ruler: 'ra',
      locations: [58],
      bm: 'm',
      type: 'fix',
      deity: 'kali',
    },
    {
      num: 9,
      ruler: 'ke',
      locations: [59],
      bm: 'm',
      type: 'fix',
      deity: 'rudra',
    },
    {
      num: 10,
      ruler: 'ra',
      locations: [60],
      bm: 'm',
      type: 'fix',
      deity: 'naga',
    },
    {
      num: 11,
      ruler: 'ke',
      locations: [1],
      bm: 'm',
      type: 'fix',
      deity: 'maruta',
    },
  ],
  karanesha: [
    { ruler: 'su', '5th': 'ju', '6th': 've' },
    { ruler: 'mo', '5th': 've', '6th': 'sa' },
    { ruler: 'ma', '5th': 'sa', '6th': 'ra' },
    { ruler: 'me', '5th': 'ra', '6th': 'ke' },
    { ruler: 'ju', '5th': 'ke', '6th': 'su' },
    { ruler: 've', '5th': 'su', '6th': 'mo' },
    { ruler: 'sa', '5th': 'mo', '6th': 'ma' },
    { ruler: 'ra', '5th': 'ma', '6th': 'me' },
    { ruler: 'ke', '5th': 'me', '6th': 'ju' },
  ],
};

export const calcKarana = (sunLng, moonLng) => { 
  const sunMoonAngle = relativeAngle(sunLng, moonLng);
  const karanaVal = sunMoonAngle / (360 / 60);
  const percent = (karanaVal % 1) * 100;
  const num = Math.ceil(karanaVal);
  const row = karanaData.karanas.find(r => r.locations.includes(num));
  return new KaranaSet({
    num,
    ...row,
    percent,
  });
}

export default karanaData;
