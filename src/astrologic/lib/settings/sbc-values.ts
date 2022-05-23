/*
 wd: Indian weekday numbers Sun = 1, Sat = 7
*/

export const sbcGrid = [
  [
    { type: 'vo', value: 'a' },
    { type: 'nk', value: 3 },
    { type: 'nk', value: 4 },
    { type: 'nk', value: 5 },
    { type: 'nk', value: 6 },
    { type: 'nk', value: 7 },
    { type: 'nk', value: 8 },
    { type: 'nk', value: 9 },
    { type: 'vo', value: 'ā' }
  ],
  [
    { type: 'nk', value: 2 },
    { type: 'vo', value: 'u' },
    { type: 'vo', value: 'a' },
    { type: 'co', value: 'va' },
    { type: 'co', value: 'ka' },
    { type: 'co', value: 'ha' },
    { type: 'co', value: 'da' },
    { type: 'vo', value: 'ū' },
    { type: 'nk', value: 10 }
  ],
  [
    { type: 'nk', value: 1 },
    { type: 'co', value: 'la' },
    { type: 'vo', value: 'lṛ' },
    { type: 'ra', value: 2 },
    { type: 'ra', value: 3 },
    { type: 'ra', value: 4 },
    { type: 'vo', value: 'lṛ' },
    { type: 'co', value: 'ma' },
    { type: 'nk', value: 11 }
  ],
  [
    { type: 'nk', value: 28 },
    { type: 'co', value: 'ca' },
    { type: 'ra', value: 1 },
    { type: 'vo', value: 'o' },
    { type: 'ti', value: { nums: [1, 6, 11], wd: [1,3] } },
    { type: 'vo', value: 'au' },
    { type: 'ra', value: 5 },
    { type: 'co', value: 'ta' },
    { type: 'nk', value: 12 }
  ],
  [
    { type: 'nk', value: 27 },
    { type: 'co', value: 'da' },
    { type: 'ra', value: 12 },
    { type: 'ti', value: {  nums: [4,9,14], wd: [6] } },
    { type: 'ti', value: {  nums: [5, 10, 15], wd: [7] } },
    { type: 'ti', value: {  nums: [2, 7, 12], wd: [2, 4] } },
    { type: 'ra', value: 8 },
    { type: 'co', value: 'pa' },
    { type: 'nk', value: 13 }
  ],
  [
    { type: 'nk', value: 26 },
    { type: 'co', value: 'sa' },
    { type: 'ra', value: 11 },
    { type: 'vo', value: 'ah' },
    { type: 'ti', value: {  nums: [3, 8, 13], wd: [5] } },
    { type: 'co', value: 'am' },
    { type: 'ra', value: 7 },
    { type: 'co', value: 'ra' },
    { type: 'nk', value: 14 }
  ],
  [
    { type: 'nk', value: 25 },
    { type: 'co', value: 'ga' },
    { type: 'vo', value: 'e' },
    { type: 'ra', value: 10 },
    { type: 'ra', value: 9 },
    { type: 'ra', value: 8 },
    { type: 'vo', value: 'ai' },
    { type: 'co', value: 'ta' },
    { type: 'nk', value: 15 }
  ],
  [
    { type: 'nk', value: 24 },
    { type: 'co', value: 'r' },
    { type: 'co', value: 'kha' },
    { type: 'co', value: 'ja' },
    { type: 'co', value: 'bha' },
    { type: 'co', value: 'na' },
    { type: 'co', value: 'na' },
    { type: 'co', value: 'ṛ' },
    { type: 'nk', value: 16 }
  ],
  [
    { type: 'vo', value: 'ī' },
    { type: 'nk', value: 23 },
    { type: 'nk', value: 22 },
    { type: 'nk', value: 21 },
    { type: 'nk', value: 20 },
    { type: 'nk', value: 19 },
    { type: 'nk', value: 18 },
    { type: 'nk', value: 17 },
    { type: 'vo', value: 'i' }
  ]
].map((cells, ri) => {
  return cells.map((cell, ci) => {
    return { ...cell, column: ci + 1, row: ri + 1 }
  })
}).reduce((a,b) => a.concat(b), []);


export const sbcDefaultBenefics = ['mo', 've', 'ju', 'me'];
export const sbcDefaultMalefics = ['su', 'ma', 'sa', 'ra', 'ke'];
