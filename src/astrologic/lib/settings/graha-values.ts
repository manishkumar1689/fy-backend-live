/*
Mercury	2	87.9691 days
Venus	3	224.701 days
Mars	4	686.971 days
Jupiter	5	11.862 years
Saturn	6	29.4571 years
Rahu	11	18.6129 years	(always retrograde, but goes direct every month for a few hours)
Uranus	7	84.0205 years
Neptune	8	164.8 years
Pluto	9	247.94 years
  { num: 0, yearLength: 0 },
  { num: 1, yearLength: 0 },
  { num: 2, yearLength: 87.9691 },
  { num: 3, yearLength: 224.701 },
  { num: 4, yearLength: 686.971 },
  { num: 5, yearLength: 4332.5029764 },
  { num: 6, yearLength: 10758.97600962 },
  { num: 101, yearLength: 0 },
  { num: 102, yearLength: 0 },
  { num: 7, yearLength: 30687.649644 }
  { num: 8, yearLength: 60191.914560000005 },
  { num: 9, yearLength: 90558.151068 }

  prefixes:

  key: graha__[subkey]_[key]
  guna: guna
  dosha: kuta__nadi
  mature: guna
  gender: gender
  dhatu: dhatu
  bhuta: bhuta
*/

import { SignHouse } from '../../interfaces/sign-house';

const grahaValues = [
  {
    num: 0,
    jyNum: 1,
    subkey: 'a_01',
    ref: 'SE_SUN',
    key: 'su',
    icon: '☉',
    nature: ['m'],
    gender: 'm',
    bhuta: '',
    guna: 'sat',
    caste: 2,
    dhatu: 2,
    dosha: ['2_2'],
    friends: ['mo', 'ma', 'ju'],
    neutral: ['me'],
    enemies: ['ve', 'sa'],
    ownSign: [5],
    exaltedDegree: 10,
    mulaTrikon: 5,
    mulaTrikonDegrees: [0, 10],
    charaKarakaMode: 'forward',
  },
  {
    num: 1,
    jyNum: 2,
    subkey: 'a_02',
    key: 'mo',
    ref: 'SE_MOON',
    icon: '☾',
    nature: ['b', 'm'],
    gender: 'f',
    bhuta: '',
    guna: 'sat',
    caste: 3,
    dhatu: 1,
    dosha: ['2_1', '2_3'],
    friends: ['su', 'me'],
    neutral: ['ma', 'ju', 've', 'sa'],
    enemies: [],
    ownSign: [4],
    exaltedDegree: 33,
    mulaTrikon: 2,
    mulaTrikonDegrees: [4, 30],
    charaKarakaMode: 'forward',
  },
  {
    num: 2,
    jyNum: 4,
    subkey: 'a_04',
    key: 'me',
    ref: 'SE_MERCURY',
    icon: '☿',
    nature: ['b', 'm'],
    gender: 'n',
    bhuta: 'prithvi',
    guna: 'raj',
    caste: 3,
    dhatu: 3,
    dosha: ['2_1', '2_2', '2_3'],
    friends: ['su', 've'],
    neutral: ['ma', 'ju', 'sa'],
    enemies: ['mo'],
    ownSign: [3, 6],
    exaltedDegree: 165,
    mulaTrikon: 6,
    mulaTrikonDegrees: [16, 20],
    yearLength: 87.9691,
    charaKarakaMode: 'forward',
    fastSpd: 1.412777777777778,
  },
  {
    num: 3,
    jyNum: 6,
    subkey: 'a_06',
    key: 've',
    ref: 'SE_VENUS',
    icon: '♀',
    nature: ['b'],
    gender: 'f',
    bhuta: 'jala',
    guna: 'raj',
    caste: 1,
    dhatu: 2,
    dosha: ['2_3', '2_1'],
    friends: ['me', 'sa'],
    neutral: ['ma', 'ju'],
    enemies: ['su', 'mo'],
    ownSign: [2, 7],
    exaltedDegree: 357,
    mulaTrikon: 7,
    mulaTrikonDegrees: [0, 15],
    yearLength: 224.701,
    charaKarakaMode: 'forward',
    fastSpd: 1.228611111111111,
  },
  {
    num: 4,
    jyNum: 3,
    subkey: 'a_03',
    key: 'ma',
    ref: 'SE_MARS',
    icon: '♂',
    nature: ['m'],
    gender: 'm',
    bhuta: 'agni',
    guna: 'tam',
    caste: 2,
    dhatu: 1,
    dosha: ['2_2'],
    friends: ['su', 'mo', 'ju'],
    neutral: ['ve', 'sa'],
    enemies: ['me'],
    ownSign: [1, 8],
    exaltedDegree: 298,
    mulaTrikon: 1,
    mulaTrikonDegrees: [0, 12],
    yearLength: 686.971,
    charaKarakaMode: 'forward',
    fastSpd: 0.650277777777778,
  },
  {
    num: 5,
    jyNum: 5,
    subkey: 'a_05',
    key: 'ju',
    ref: 'SE_JUPITER',
    icon: '♃',
    nature: ['b'],
    gender: 'm',
    bhuta: 'akasha',
    guna: 'sat',
    caste: 1,
    dhatu: 3,
    dosha: ['2_3'],
    friends: ['su', 'mo', 'ma'],
    neutral: ['sa'],
    enemies: ['me', 've'],
    ownSign: [9, 12],
    exaltedDegree: 95,
    mulaTrikon: 9,
    mulaTrikonDegrees: [0, 10],
    yearLength: 4332.5029764,
    charaKarakaMode: 'forward',
    fastSpd: 0.212222222222222,
  },
  {
    num: 6,
    jyNum: 7,
    subkey: 'a_07',
    key: 'sa',
    ref: 'SE_SATURN',
    icon: '♄',
    nature: ['m'],
    gender: 'n',
    bhuta: 'vayu',
    guna: 'tam',
    caste: 4,
    dhatu: 1,
    dosha: ['2_1'],
    friends: ['me', 've'],
    neutral: ['ju'],
    enemies: ['su', 'mo', 'ma'],
    ownSign: [10, 11],
    exaltedDegree: 200,
    mulaTrikon: 11,
    mulaTrikonDegrees: [0, 20],
    yearLength: 10758.97600962,
    charaKarakaMode: 'forward',
    fastSpd: 0.098333333333333,
  },
  {
    num: 101,
    jyNum: 8,
    subkey: 'a_08',
    key: 'ra',
    ref: 'SE_TRUE_NODE',
    altRef: 'SE_MEAN_NODE',
    icon: '☊',
    nature: ['m'],
    gender: 'n',
    bhuta: '',
    guna: 'tam',
    caste: 5,
    dhatu: 1,
    dosha: ['2_1'],
    friends: ['ve','sa','ke','me'],
    neutral: ['ju'],
    enemies: ['su', 'mo', 'ma'],
    ownSign: [11, 6],
    exaltedDegree: 50,
    mulaTrikon: 3,
    mulaTrikonDegrees: [0, 20],
    charaKarakaMode: 'reverse',
  },
  {
    num: 102,
    jyNum: 9,
    subkey: 'a_09',
    key: 'ke',
    ref: 'SE_TRUE_NODE',
    altRef: 'SE_MEAN_NODE',
    icon: '☋',
    calc: 'opposite',
    nature: ['m'],
    gender: 'n',
    bhuta: '',
    guna: 'tam',
    caste: 5,
    dhatu: 3,
    dosha: ['2_2'],
    friends: ['ma', 'ju', 've'],
    neutral: ['me', 'ra', 'sa'],
    enemies: ['su', 'mo'],
    ownSign: [8, 12],
    exaltedDegree: 230,
    mulaTrikon: 9,
    mulaTrikonDegrees: [0, 20],
  },
  {
    num: 7,
    jyNum: 10,
    subkey: 'a_10',
    key: 'ur',
    ref: 'SE_URANUS',
    icon: '♅',
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [11],
    yearLength: 30687.649644,
  },
  {
    num: 8,
    jyNum: 11,
    subkey: 'a_11',
    key: 'ne',
    ref: 'SE_NEPTUNE',
    icon: '♆',
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [12],
    yearLength: 60191.914560000005,
  },
  {
    num: 9,
    jyNum: 12,
    subkey: 'a_12',
    key: 'pl',
    ref: 'SE_PLUTO',
    icon: '♇',
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [8],
    yearLength: 90558.151068,
  },
];

export default grahaValues;

export const naturalBenefics = ['mo', 've', 'ju'];
export const naturalMalefics = ['su', 'ma', 'sa'];
export const naturalNeutral = ['me'];

export const functionalHouseNatures = [
  { house: 1, nature: 'b', index: 0 },
  { house: 2, nature: 'n', set: 2, index: 0 },
  { house: 3, nature: 'm', index: 0 },
  { house: 4, nature: 'n', set: 1, index: 0 },
  { house: 5, nature: 'b', index: 1 },
  { house: 6, nature: 'm', index: 1 },
  { house: 7, nature: 'n', set: 1, index: 1 },
  { house: 8, nature: 'n', set: 2, index: 2 },
  { house: 9, nature: 'b', index: 2 },
  { house: 10, nature: 'n', set: 1, index: 2 },
  { house: 11, nature: 'm', index: 2 },
  { house: 12, nature: 'n', set: 2, index: 0 },
];

export const aspectGroups = [
  [
    { key: 'conjunction', div: 1, fac: 1, cg: 'red' },
    { key: 'opposition', div: 2, fac: 1, cg: 'red' },
    { key: 'trine', div: 3, fac: 1, cg: 'blue' },
    { key: 'square', div: 4, fac: 1, cg: 'red' },
  ],
  [{ key: 'sextile', div: 6, fac: 1, cg: 'green' }],
  [
    { key: 'sesqui-square', div: 3, fac: 3, cg: 'red' },
    { key: 'quincunx', div: 12, fac: 5, cg: 'black' },
    { key: 'semi-square', div: 8, fac: 1, cg: 'red' },
  ],
  [
    { key: 'semi-sextile', div: 2, fac: 1, cg: 'grey' },
    { key: 'quintile', div: 5, fac: 1, cg: 'grey' },
    { key: 'bi-quintile', div: 5, fac: 2, cg: 'grey' },
  ],
  [
    { key: 'virgintile', div: 20, fac: 1, cg: 'grey' },
    { key: 'quindecile', div: 24, fac: 11, cg: 'grey' },
    { key: 'undecile', div: 11, fac: 1, cg: 'grey' },
    { key: 'dectile', div: 10, fac: 1, cg: 'grey' },
    { key: 'novile', div: 9, fac: 1, cg: 'grey' },
    { key: 'bi-novile', div: 9, fac: 2, cg: 'grey' },
    { key: 'quad-novile', div: 9, fac: 4, cg: 'grey' },
    { key: 'tri-decile', div: 10, fac: 3, cg: 'grey' },
    { key: 'tri-septile', div: 7, fac: 3, cg: 'grey' },
    { key: 'bi-septile', div: 7, fac: 2, cg: 'grey' },
    { key: 'septile', div: 7, fac: 1, cg: 'grey' },
  ],
];

/**
 * Dik Bala
 * It Sun & Mars get directional strength in  the 10th House
Jupiter & Mercury get directional strength in  the 1st house
Saturn gets directional strength in the 7th House
Venus & Moon get directional strength in 4th House
 */
export const directionalStrengthMap = {
  su: 10,
  mo: 4,
  ma: 10,
  me: 1,
  ju: 1,
  ve: 4,
  sa: 7,
};

export const orbGrahaMatches = [
  { group: 1, orbs: [12, 5, 3, 1, 0.5], keys: ['su', 'mo'] },
  { group: 2, orbs: [7, 5, 2, 1, 0.5], keys: ['me', 've', 'ma'] },
  { group: 3, orbs: [5, 2, 1, 0.5], keys: ['ju', 'sa'] },
  { group: 4, orbs: [3, 2, 1, 1, 0.5], keys: ['ur', 'ne', 'pl'] },
  { group: 6, orbs: [1, 0, 0, 0, 0], keys: ['ra', 'ke'] },
  { group: 7, orbs: [7, 5, 2, 1, 0.5], keys: ['as', 'ds', 'mc', 'ic'] },
];

export const rulerSignsMap = (): Map<string, number[]> => {
  const mp = new Map<string, number[]>();
  grahaValues.forEach(gr => {
    if (gr instanceof Object) {
      const { ownSign, jyNum } = gr;
      if (jyNum) {
        if (jyNum > 0 && jyNum <= 9 && ownSign instanceof Array) {
          mp.set(gr.key, ownSign);
        }
      }
    }
  });
  return mp;
};

export const buildFunctionalBMMap = (
  grahaKeys: Array<string>,
  signHouses: Array<SignHouse>,
) => {
  const grahaNatures = grahaKeys.map(key => {
    const signs = rulerSignsMap().get(key);
    const matches: Array<any> = [];
    const houses = [];
    const natures: Array<string> = [];
    signs.forEach(sign => {
      const signHouse = signHouses.find(sh => sh.sign === sign);
      const { house } = signHouse;
      const match = functionalHouseNatures.find(fh => fh.house === house);
      if (match) {
        matches.push(match);
        natures.push(match.nature);
        houses.push(house);
      }
    });
    const numBenefics = natures.filter(n => n === 'b').length;
    const numMalefics = natures.filter(n => n === 'm').length;
    const numNeutral = natures.filter(n => n === 'n').length;
    let nature = natures[0];
    if (numBenefics === 2 || (numBenefics === 1 && numNeutral === 1)) {
      nature = 'b';
    } else if (numNeutral === 2 || (numBenefics === 1 && numMalefics === 1)) {
      nature = 'n';
    } else if (numMalefics === 2 || (numMalefics === 1 && numNeutral === 1)) {
      nature = 'm';
    }
    return {
      key,
      nature,
      matches,
    };
  });
  const mp = new Map<string, Array<string>>();
  const natures = ['b', 'm', 'n'];
  natures.forEach(n => {
    mp.set(n, []);
  });
  grahaNatures.forEach(row => {
    const nSet = mp.get(row.nature);
    nSet.push(row.key);
    mp.set(row.nature, nSet);
  });
  return mp;
};

export const matchPlanetNum = (key: string): number => {
  const row = grahaValues.find(gr => gr.key === key);
  return row instanceof Object ? row.num : -1;
};

export const directionalStrengthToTransitionMap = {
  su: 'mc',
  mo: 'ic',
  ma: 'mc',
  me: 'rise',
  ju: 'rise',
  ve: 'ic',
  sa: 'set',
};

export const combustionOrbs = {
  me: { direct: 13, retro: 12 },
  ve: { direct: 9, retro: 8 },
  ma: { direct: 17, retro: 17 },
  ju: { direct: 11, retro: 11 },
  sa: { direct: 15, retro: 15 },
};

export const hasDikBala = (key = 'su', type = 'rise') => {
  return Object.keys(directionalStrengthToTransitionMap).includes(key)
    ? directionalStrengthToTransitionMap[key] === type
    : false;
};

export const matchDikBalaTransition = (key = '') => {
  return Object.keys(directionalStrengthToTransitionMap).includes(key)
    ? directionalStrengthToTransitionMap[key]
    : '';
};

