export const facetedBig5Categories = [
  {
    key: 'A',
    title: 'Agreeableness',
    facets: [
      { num: 1, title: 'Trust' },
      { num: 2, title: 'Morality' },
      { num: 3, title: 'Altruism' },
      { num: 4, title: 'Cooperation' },
      { num: 5, title: 'Modesty' },
      { num: 6, title: 'Sympathy' },
    ],
  },
  {
    key: 'C',
    title: 'Conscientiousness',
    facets: [
      { num: 1, title: 'Self-Efficacy' },
      { num: 2, title: 'Orderliness' },
      { num: 3, title: 'Dutifulness' },
      { num: 4, title: 'Achievement-Striving' },
      { num: 5, title: 'Self-Discipline' },
      { num: 6, title: 'Cautiousness' },
    ],
  },
  {
    key: 'E',
    title: 'Extroversion',
    facets: [
      { num: 1, title: 'Friendliness' },
      { num: 2, title: 'Gregariousness' },
      { num: 3, title: 'Assertiveness' },
      { num: 4, title: 'Activity Level' },
      { num: 5, title: 'Excitement-Seeking' },
      { num: 6, title: 'Cheerfulness' },
    ],
  },
  {
    key: 'N',
    title: 'Neuroticism',
    facets: [
      { num: 1, title: 'Anxiety' },
      { num: 2, title: 'Anger' },
      { num: 3, title: 'Depression' },
      { num: 4, title: 'Self-Consciousness' },
      { num: 5, title: 'Immoderation' },
      { num: 6, title: 'Vulnerability' },
    ],
  },
  {
    key: 'O',
    title: 'Openness to experience',
    facets: [
      { num: 1, title: 'Imagination' },
      { num: 2, title: 'Artistic Interests' },
      { num: 3, title: 'Emotionality' },
      { num: 4, title: 'Adventurousness' },
      { num: 5, title: 'Intellect' },
      { num: 6, title: 'Liberalism' },
    ],
  },
];

export const facetedJungianCategories = [
  { key: 'IE', title: 'Introversion - Extroversion' },
  { key: 'SN', title: 'Sensing – Intuition' },
  { key: 'FT', title: 'Feeling – Thinking' },
  { key: 'JP', title: 'Judging – Perceiving' },
];

export const facetedJungianFormulae = [
  {
    domain: 'IE',
    start: 30,
    sequence: ['-', '-', '-', '+', '-', '+', '+', '-'],
  },
  {
    domain: 'SN',
    start: 12,
    sequence: ['+', '+', '+', '+', '+', '-', '-', '+'],
  },
  {
    domain: 'FT',
    start: 30,
    sequence: ['-', '+', '+', '-', '-', '+', '-', '-'],
  },
  {
    domain: 'JP',
    start: 18,
    sequence: ['+', '+', '-', '+', '-', '+', '-', '+'],
  },
];
