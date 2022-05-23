import { KeyName } from '../interfaces';

export interface SlugName {
  slug: string;
  name: string;
  parents?: string[];
}

export interface SlugNameVocab extends SlugName {
  vocab?: string;
}

interface RelOptSet {
  key: string;
  name: string;
  options: Array<SlugName>;
}

export const typeTags = [
  { slug: 'spouse', name: 'spouse' },
  { slug: 'spousal_equivalent', name: 'spousal equivalent' },
  { slug: 'lover', name: 'lover' },
  { slug: 'lived_together', name: 'lived together' },
  { slug: 'one_night_stand', name: 'one night stand' },
  { slug: 'friendship', name: 'Friendship' },
  { slug: 'business_partner', name: 'Business partner' },
];

export const oldHappinessTags = [
  { slug: 'always_happy', name: 'always happy' },
  { slug: 'mostly_happy', name: 'mostly happy' },
  { slug: 'happy', name: 'happy' },
  { slug: 'dutiful', name: 'dutiful' },
  { slug: 'neutral', name: 'neutral' },
  { slug: 'mixed_happiness', name: 'mixed happiness' },
  { slug: 'mostly_unhappy', name: 'mostly unhappy' },
  { slug: 'always_unhappy', name: 'always unhappy' },
  { slug: 'ups_downs', name: 'ups & downs' },
];

export const qualityTags = [
  { slug: 'good', name: 'good' },
  { slug: 'bad', name: 'bad' },
  { slug: 'boring_dull', name: 'boring / dull' },
  { slug: 'exciting', name: 'exciting' },
  { slug: 'sexual_chemistry', name: 'sexual chemistry' },
  { slug: 'multiple_breakups', name: 'multiple breakups' },
  { slug: 'domestic_abuse', name: 'domestic abuse' },
];

//export const traitTags = [...happinessTags, ...qualityTags];

export const happinessTags = [
  { slug: 'good', name: 'good' },
  { slug: 'bad', name: 'bad' },
  { slug: 'strong_chemistry', name: 'strong chemistry' },
  { slug: 'mostly_happy', name: 'mostly happy' },
  { slug: 'mostly_unhappy', name: 'mostly unhappy' },
  { slug: 'mixed_happiness', name: 'mixed happiness' },
  { slug: 'dutiful_neutral', name: 'dutiful / neutral' },
  { slug: 'multiple_breakups', name: 'multiple breakups' },
  { slug: 'ups_downs', name: 'ups & downs' },
  { slug: 'abuse', name: 'abuse' },
];

export const endHowTags = [
  { slug: 'ongoing', name: 'Ongoing' },
  { slug: 'neither', name: 'Neither' },
  { slug: 'divorce', name: 'Divorce' },
  { slug: 'separation', name: 'Separation' },
  { slug: 'death', name: 'Death' },
  { slug: 'murder', name: 'Murder' },
  { slug: 'stress_traumatic_event', name: 'Stress traumatic event' },
];

export const endWhoTags = [
  { slug: '-', name: 'N/A', parents: [] },
  {
    slug: 'p1_divorces_p2',
    name: 'P1 divorces P2',
    parents: ['divorce'],
  },
  {
    slug: 'p2_divorces_p1',
    name: 'P2 divorces P1',
    parents: ['divorce'],
  },
  { slug: 'p1_leaves_p2', name: 'P1 leaves P2', parents: ['separation'] },
  { slug: 'p2_leaves_p1', name: 'P2 leaves P1', parents: ['separation'] },
  { slug: 'p1_dies', name: 'P1 passes away', parents: ['death'] },
  { slug: 'p2_dies', name: 'P2 passes away', parents: ['death'] },
  { slug: 'p1_kills_p2', name: 'P1 kills P2', parents: ['murder'] },
  { slug: 'p2_kills_p1', name: 'P2 kills P1', parents: ['murder'] },
  {
    slug: 'p1_murder_other',
    name: 'P1 murdered by other',
    parents: ['murder'],
  },
  {
    slug: 'p2_murder_other',
    name: 'P2 murdered by other',
    parents: ['murder'],
  },
];

export const defaultPairedTagOptionSets: Array<RelOptSet> = [
  {
    key: 'type',
    name: 'Type',
    options: typeTags,
  },
  {
    key: 'quality',
    name: 'Quality',
    options: [...happinessTags, ...qualityTags],
  },
  {
    key: 'end_how',
    name: 'How did it end?',
    options: endHowTags,
  },
  {
    key: 'end_who',
    name: 'Who ended it?',
    options: endWhoTags,
  },
];

export const matchDefaultVocabOptions = (key = '') => {
  const optSet = defaultPairedTagOptionSets.find(os => os.key === key);
  let options: SlugName[] = [];
  if (optSet instanceof Object) {
    options = optSet.options;
  }
  return options;
};

export const matchDefaultVocabOptionKeys = (key = '') => {
  const options = matchDefaultVocabOptions(key);
  return options.map(tg => tg.slug);
};

export const matchVocabKey = (slug = '') => {
  const slugStr = slug.replace(/-/g, '_');
  let vKey = '';
  const vocab = defaultPairedTagOptionSets.find(os =>
    os.options.some(tg => tg.slug === slugStr),
  );
  if (vocab instanceof Object) {
    vKey = vocab.key;
  }
  return vKey;
};
