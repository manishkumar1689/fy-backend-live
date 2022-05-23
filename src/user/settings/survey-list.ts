const surveyList = [
  {
    key: 'preference',
    name: 'Core Preferences',
    multiscales: '',
    type: 'preferences',
    enabled: true,
  },
  {
    key: 'faceted',
    name: 'Faceted',
    multiscales: 'big5',
    type: 'faceted',
    enabled: true,
    range: [-2, 2],
  },
  {
    key: 'jungian',
    name: 'Jungian',
    multiscales: 'jungian',
    type: 'jungian',
    enabled: true,
    range: [-2, 2],
  },
  {
    key: 'feedback',
    name: 'Feedback',
    multiscales: '',
    type: 'feedback',
    enabled: true,
  },
];

export default surveyList;
