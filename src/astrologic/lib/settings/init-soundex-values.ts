const soundMap = [
  { type: 'vo', value: 'a', ipa: ['a', 'ə'] },
  { type: 'vo', value: 'ā', ipa: ['ā'] },
  { type: 'vo', value: 'u', ipa: ['u'] },
  { type: 'vo', value: 'a', ipa: ['a', ''] },
  { type: 'co', value: 'va', ipa: ['v', 'w'] },
  { type: 'co', value: 'ka', ipa: ['k'] },
  { type: 'co', value: 'ha', ipa: ['h', 'ç'] },
  { type: 'co', value: 'da', ipa: ['d', 'ð', 'dʰ'] },
  { type: 'vo', value: 'ū', ipa: ['u:'] },
  { type: 'co', value: 'la', ipa: ['l'] },
  { type: 'co', value: 'ma', ipa: ['m'] },
  { type: 'co', value: 'ca', ipa: ['tʃ', 'ʃ'] },
  { type: 'vo', value: 'o', ipa: ['o', 'ɔ'] },
  { type: 'vo', value: 'au', ipa: ['au', 'aw'] },
  { type: 'co', value: 'ta', ipa: ['t', 'tʰ', 'θ'] },
  { type: 'co', value: 'da', ipa: ['d', 'dʰ'] },
  { type: 'co', value: 'pa', ipa: ['p', 'pʰ'] },
  { type: 'co', value: 'sa', ipa: ['s'] },
  { type: 'vo', value: 'ah', ipa: ['a'] },
  { type: 'co', value: 'am', ipa: ['m'] },
  { type: 'co', value: 'ra', ipa: ['r'] },
  { type: 'co', value: 'ga', ipa: ['g'] },
  { type: 'vo', value: 'e', ipa: ['e', 'ɛ', 'e:'] },
  { type: 'vo', value: 'ai', ipa: ['ai', 'aj', 'əi'] },
  { type: 'co', value: 'r', ipa: ['r'] },
  { type: 'co', value: 'kha', ipa: ['kʰ', 'x'] },
  { type: 'co', value: 'ja', ipa: ['ʤ', 'dʒ', 'ʒ'] },
  { type: 'co', value: 'bha', ipa: ['bʰ'] },
  { type: 'co', value: 'na', ipa: ['n'] },
  { type: 'co', value: 'ṛ', ipa: ['ṛ', 'ɾ'] },
  { type: 'vo', value: 'ī', ipa: ['i:'] },
  { type: 'vo', value: 'i', ipa: ['i'] }
];

export const initLetterMatchesbyLang = [
  {
    key: 'en',
    overrides: [
      {
        key: 'j',
        value: 'ja'
      },
      {
        key: 'w',
        value: 'va'
      },
      {
        key: 'k',
        value: 'kha'
      },
      {
        key: 'c',
        value: 'kha'
      },
      {
        key: 'ch',
        value: 'ca'
      },
      {
        key: 'ce',
        value: 'sa'
      },
      {
        key: 'ci',
        value: 'sa'
      },
      {
        key: 'ge',
        value: 'ja'
      },
      {
        key: 'gi',
        value: 'ja'
      },
      {
        key: 'gertrude',
        value: 'ga'
      },
      {
        key: 'ear',
        value: 'e'
      },
      {
        key: 'o',
        value: 'a'
      },
      {
        key: 'or',
        value: 'o'
      },
      {
        key: 'oo',
        value: 'ū'
      },
      {
        key: 'au',
        value: 'o'
      },
      {
        key: 'aw',
        value: 'o'
      },
      {
        key: 'ee',
        value: 'ī'
      },
      {
        key: 'u[bcdfghklmnprstvwxz][aeiou]',
        value: 'ya'
      },
      {
        key: 'th',
        value: 'ta'
      },
      {
        key: 'sh',
        value: 'ś'
      },
    ]
  },
  {
    key: 'de',
    overrides: [
      {
        key: 'j',
        value: 'y'
      },
      {
        key: 'w',
        value: 'va'
      },
      {
        key: 'k',
        value: 'kha'
      },
      {
        key: 'ae',
        value: 'e'
      },
      {
        key: 'ä',
        value: 'e'
      },
      {
        key: 'oe',
        value: 'e'
      },
      {
        key: 'ö',
        value: 'e'
      },
      {
        key: 'ue',
        value: 'u'
      },
      {
        key: 'ü',
        value: 'u'
      },
      {
        key: 'z',
        value: 't'
      },
      {
        key: 'sch',
        value: 's'
      },
      {
        key: 'eu',
        value: 'o'
      },
      {
        key: 'ei',
        value: 'ai'
      },
    ]
  },
  {
    key: 'es',
    overrides: [
      {
        key: 'j',
        value: 'ha'
      },
      {
        key: 'w',
        value: 'va'
      },
      {
        key: 'v',
        value: 'ba'
      },
      {
        key: 'h',
        value: ''
      },
      {
        key: 'ge',
        value: 'ha'
      },
      {
        key: 'gi',
        value: 'ha'
      },
      {
        key: 'z',
        value: 's'
      },
      {
        key: 'll',
        value: 'y'
      },
      {
        key: 'h',
        value: ''
      },
      {
        key: 'ci',
        value: 'sa'
      },
      {
        key: 'ce',
        value: 'sa'
      },
    ]
  },
  {
    key: 'fr',
    overrides: [
      {
        key: 'j',
        value: 'ja'
      },
      {
        key: 'w',
        value: 'va'
      },
      {
        key: 'v',
        value: 'ba'
      },
      {
        key: 'h',
        value: ''
      },
      {
        key: 'ge',
        value: 'ja'
      },
      {
        key: 'gi',
        value: 'ja'
      },
      {
        key: 'z',
        value: 's'
      },
      {
        key: 'ch',
        value: 'ca'
      },
      {
        key: 'h',
        value: ''
      },
      {
        key: 'ci',
        value: 'sa'
      },
      {
        key: 'ce',
        value: 'sa'
      },
      {
        key: 'ou',
        value: 'u'
      },
      {
        key: 'eu',
        value: 'e'
      },
    ]
  },
  {
    key: 'it',
    overrides: [
      {
        key: 'j',
        value: 'y'
      },
      {
        key: 'w',
        value: 'va'
      },
      {
        key: 'k',
        value: 'ka'
      },
      {
        key: 'ue',
        value: 'u'
      },
      {
        key: 'ge',
        value: 'j'
      },
      {
        key: 'gi',
        value: 'j'
      },
      {
        key: 'z',
        value: 'd'
      },
      {
        key: 'ch',
        value: 'k'
      },
      {
        key: 'gli',
        value: 'lr'
      },
      {
        key: 'h',
        value: ''
      },
      {
        key: 'ci',
        value: 'ca'
      },
      {
        key: 'ce',
        value: 'ca'
      },
    ]
  },
  {
    key: 'pl',
    overrides: [
      {
        key: 'j',
        value: 'y'
      },
      {
        key: 'w',
        value: 'va'
      },
      {
        key: 'k',
        value: 'ka'
      },
      {
        key: 'dź',
        value: 'j'
      },
      {
        key: 'ź',
        value: 'j'
      },
      {
        key: 'z',
        value: 's'
      },
      {
        key: 'Ł',
        value: 'va'
      },
      {
        key: 'cz',
        value: 'ca'
      }
    ]
  },
];

export default soundMap;