const ayanamshaValues = [
  { key: 'raw', value: 0, name: 'Tropical' },
  { key: 'true_citra', value: 27, name: 'True Chitra' },
  { key: 'lahiri', value: 1, name: 'Lahiri' },
  { key: 'krishnamurti', value: 5, name: 'Krishnamurti' },
  { key: 'yukteshwar', value: 7, name: 'Yuktesvar' },
  { key: 'raman', value: 3, name: 'Raman' },
  { key: 'valens_moon', value: 42, name: 'Valens' },
  { key: 'true_mula', value: 35, name: 'True Mula' },
  { key: 'true_revati', value: 28, name: 'True Revati' },
  { key: 'true_pushya', value: 29, name: 'True Pushya' },
  { key: 'true_sheoran', value: 39, name: 'True Sheoran' },
  { key: 'aldebaran_15tau', value: 14, name: 'Aldebaran' },
  { key: 'galcent_mula_wilhelm', value: 36, name: 'G.C. Wilhelm' },
  { key: 'galcent_cochrane', value: 40, name: 'Cochrane' },
  { key: 'hipparchos', value: 15, name: 'Hipparchos' },
  { key: 'sassanian', value: 16, name: 'Sassanian' },
  { key: 'ushashashi', value: 4, name: 'Usha/Shashi' },
  { key: 'jn_bhasin', value: 8, name: 'J.N. Bhasin' },
];

export const matchAyanamshaNum = (key = 'true_citra') => {
  const row = ayanamshaValues.find(r => r.key === key);
  return row instanceof Object ? row.value : -1;
};

export const matchAyanamshaKey = (num = 0) => {
  const row = ayanamshaValues.find(r => r.value === num);
  return row instanceof Object ? row.key : '';
};

export default ayanamshaValues;
