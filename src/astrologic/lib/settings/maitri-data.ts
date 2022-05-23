import { KutaGrahaItem } from '../kuta';
import { Graha } from '../models/graha-set';
import rashiValues from './rashi-values';

/*
   Pañcaka-maitri (5 fold Planetary Relationships)

   natural relationship: done (array below)

   temporary relationships: Number of Bhavas/(Rashis) the 2nd planet is
     friend:{ 2,3,4,10,11,12 },
     enemy:{ 1,5,6,7,8,9 },

   Compound relationships: NATURAL + TEMPORARY
     greatFriend:[{natural: "friend",temporary: "friend"}],
          Friend:[{natural: "neutral", temporary: "friend"}],
         Neutral:[{natural: "friend", temporary: "enemy"},{natural: "enemy",temporary: "friend"}]
           Enemy:{"neutral","enemy"},
      greatEnemy:{"enemy","enemy"},

DIGNITIES:
    8. Exaltation         ucca (उच्च)
    7. Root Triangle      mūlatrikona (मूलत्रिकोन)
    6. Own Field (sign)   svakṣetra (स्वक्षेत्र)
    5. Best friend        adhi mitra (अधि मित्र)
    4. Friend             mitra (मित्र)
    3. Neutral            sama (सम)
    2. Enemy              śatru (शत्रु)
    1. Arch enemy        adhi śatru (अधि शत्रु)
    0. Debilitation       nīca (नीच)

    dict prefixes:
    dignity
*/

const maitriData = {
  natural: [
    {
      graha: 'su',
      friends: ['mo', 'ma', 'ju'],
      neutral: ['me'],
      enemies: ['ve', 'sa'],
    },
    {
      graha: 'mo',
      friends: ['su', 'me'],
      neutral: ['ma', 'ju', 've', 'sa'],
      enemies: [],
    },
    {
      graha: 'ma',
      friends: ['su', 'mo', 'ju'],
      neutral: ['ve', 'sa'],
      enemies: ['me'],
    },
    {
      graha: 'me',
      friends: ['su', 've'],
      neutral: ['ma', 'ju', 'sa'],
      enemies: ['mo'],
    },
    {
      graha: 'ju',
      friends: ['su', 'mo', 'ma'],
      neutral: ['sa'],
      enemies: ['me', 've'],
    },
    {
      graha: 've',
      friends: ['me', 'sa'],
      neutral: ['ma', 'ju'],
      enemies: ['su', 'mo'],
    },
    {
      graha: 'sa',
      friends: ['me', 've'],
      neutral: ['ju'],
      enemies: ['su', 'mo', 'ma'],
    },
    { graha: 'ra', friends: ['ve','sa','ke','me'], neutral: ['ju'], enemies: ['su', 'mo', 'ma'] },
    { graha: 'ke', friends: ['ma', 'ju', 've'], neutral: ['me', 'ra', 'sa'], enemies: ['su', 'mo'] },
  ],
  temporary: {
    friend: [2, 3, 4, 10, 11, 12],
    enemy: [1, 5, 6, 7, 8, 9],
  },
  compound: {
    bestFriend: [{ natural: 'friend', temporary: 'friend' }],
    friend: [{ natural: 'neutral', temporary: 'friend' }],
    neutral: [
      { natural: 'friend', temporary: 'enemy' },
      { natural: 'enemy', temporary: 'friend' },
    ],
    enemy: [{ natural: 'neutral', temporary: 'enemy' }],
    archEnemy: [{ natural: 'enemy', temporary: 'enemy' }],
  },
  dict: {
    exalted: '8_uc',
    mulaTrikon: '7_mt',
    ownSign: '6_sv',
    bestFriend: '5_am',
    friend: '4_mi',
    neutral: '3_sa',
    enemy: '2_sh',
    archEnemy: '1_as',
    debilitated: '0_ni',
  },
};

export const matchLord = (graha: Graha | KutaGrahaItem) => {
  const rashiRow = rashiValues.find(rs => rs.num === graha.sign);
  let ruler = '';
  if (rashiRow) {
    ruler = rashiRow.ruler;
  }
  return ruler;
};

export const matchKutaLord = (kg: KutaGrahaItem) => {
  const rashiRow = rashiValues.find(rs => rs.num === kg.rashi.num);
  let ruler = '';
  if (rashiRow) {
    ruler = rashiRow.ruler;
  }
  return ruler;
};

export const matchRelations = (
  rel1: string,
  rel2: string,
  comparison: string,
): boolean => {
  let relKey = '';
  if (rel1 === 'friend' && rel2 === 'fiend') {
    relKey = 'friends';
  } else if (rel1 === 'enemy' && rel2 === 'enemy') {
    relKey = 'enemies';
  } else if (rel1 === 'neutral' && rel2 === 'neutral') {
    relKey = 'neutral';
  } else {
    relKey = 'different';
  }
  return relKey === comparison;
};

export const matchNaturalMaitri = (gk1: string, gk2: string): string => {
  let natural = '';
  const row = maitriData.natural.find(item => item.graha === gk1);
  if (row) {
    if (gk2.length > 1) {
      if (row.friends.includes(gk2)) {
        natural = 'friend';
      } else if (row.neutral.includes(gk2)) {
        natural = 'neutral';
      } else if (row.enemies.includes(gk2)) {
        natural = 'enemy';
      }
    }
  }
  return natural;
};

export const matchNaturalGrahaMaitri = (
  g1: Graha | KutaGrahaItem,
  g2: Graha | KutaGrahaItem,
) => {
  const ruler1 = matchLord(g1);
  const ruler2 = matchLord(g2);
  const sameRuler = ruler1 === ruler2;
  const rel1 = sameRuler ? 'same' : matchNaturalMaitri(ruler1, ruler2);
  const rel2 = sameRuler ? 'same' : matchNaturalMaitri(ruler2, ruler1);
  return [rel1, rel2];
};

export default maitriData;
