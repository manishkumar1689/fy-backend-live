export const defaultCompatibilityCategoryOpts = [
  { key: 'emotional', name: 'Emotional', maxScore: 10 },
  { key: 'activity', name: 'Activity', maxScore: 10 },
  { key: 'sexual', name: 'Sexual', maxScore: 10 },
  { key: 'communication', name: 'Communication', maxScore: 10 },
  { key: 'material_success', name: 'Material Success', maxScore: 10 },
];

export const contextTypes = [
  {
    key: 'in_house',
    name: 'in house',
    isAspect: false,
    c2groups: ['houses'],
    isKuta: false,
  },
  {
    key: 'in_sign',
    name: 'in sign',
    isAspect: false,
    c2groups: ['signs'],
    isKuta: false,
  },
  {
    key: 'nakshatra',
    name: 'in nakṣatra',
    isAspect: false,
    c2groups: ['nakshatra'],
    isKuta: false,
  },
  {
    key: 'has_dignity_bala_type',
    name: 'has dignity/bala',
    isAspect: false,
    c2groups: ['dignities'],
    isKuta: false,
  },
  {
    key: 'state_compare',
    name: 'state compare',
    isAspect: false,
    c2groups: ['signs'],
    isKuta: false,
  },
  {
    key: 'conjunction',
    name: 'in conjunction with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'opposition',
    name: 'in opposition with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'square',
    name: 'in square with in',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'trine',
    name: 'Trine with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },

  {
    key: 'quinquix',
    name: 'in quinquix with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'sextile',
    name: 'in Sextile with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'quincunx',
    name: 'in Quincunx',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'hard_aspect',
    name: 'in hard aspect to',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'soft_aspect',
    name: 'in soft aspect to',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'any_aspect',
    name: 'in any aspect with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'decl_parallel',
    name: 'in parallel with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
    type: 'declination',
  },
  {
    key: 'incontra_parallel',
    name: 'in c.-parallel with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
    type: 'declination',
  },
  {
    key: 'same_sign',
    name: 'in Same Sign as',
    isAspect: false,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'graha_yuti',
    name: 'in yuti with',
    isAspect: false,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'sends_graha_drishti',
    name: 'sends g.dṛṣṭi to',
    isAspect: false,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'receives_graha_drishti',
    name: 'gets g.dṛṣṭi from',
    isAspect: false,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'mutual_graha_drishti',
    name: 'mutual g.dṛṣṭi with',
    isAspect: false,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'rashi_drishti',
    name: 'in rāśi dṛṣṭi with',
    isAspect: true,
    c2groups: ['graha', 'lordship', 'cara_karakas', 'bm', 'special'],
    isKuta: false,
  },
  {
    key: 'kartari_yoga',
    name: 'kartari yoga with',
    isAspect: true,
    c2groups: ['grahas', 'mb'],
    isKuta: false,
  },
  {
    key: 'shubha_kartari_yoga',
    name: 'has kartari yoga',
    isAspect: false,
    c2groups: [],
    isKuta: false,
  },
  {
    key: 'papa_kartari_yoga',
    name: 'has papa kartari yoga',
    isAspect: false,
    c2groups: [],
    isKuta: false,
  },
  {
    key: 'all_ashtakutas',
    name: 'Aṣṭakūṭas',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'all_dvadashakutas',
    name: 'Dvadaśakūṭas',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'dvadasha_other_kutas',
    name: 'Dvadaśa + other kutas',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'varna_kuta',
    name: 'Varṇa Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'vashya_kuta',
    name: 'Vaśya Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'graha_maitri',
    name: 'Graha Maitri',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'rashi_kuta',
    name: 'Rāśi Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'dina_tara_kuta',
    name: 'Dina (Tara) Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'yoni_kuta',
    name: 'Yoni Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'gana_kuta',
    name: 'Gana Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'nadi_kuta',
    name: 'Nādī Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'rajju_Kuta',
    name: 'Rajju Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'vedha_Kuta',
    name: 'Vedha Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'mahendra',
    name: 'Mahendra',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'stri_dirgha',
    name: 'Strī Dīrghā',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'gotra_kuta',
    name: 'Gotra Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'vihamga_kuta',
    name: 'Vihaṃga Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'yonyanukulya_kuta',
    name: 'Yonyānukulya Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'naksatra_bhuta_kuta',
    name: 'Nakṣatra Bhūta Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'rashi_bhuta_kuta',
    name: 'Rāśi Bhūta Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'aya_vyaya_kuta',
    name: 'Āya-Vyaya kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'rna_dhana_kuta',
    name: 'Ṛṇa-Dhana kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
  {
    key: 'vainashika_kuta',
    name: 'Vaināśika Kūṭa',
    isAspect: false,
    c2groups: ['all'],
    isKuta: true,
  },
];

export const aspectQualities = [
  {
    key: 'applying_aspect',
    name: 'Applying aspect',
    isAspect: true,
    isKuta: false,
  },
  {
    key: 'separating_aspect',
    name: 'Separating Aspect',
    isAspect: true,
    isKuta: false,
  },
];

export const pairedChartRatings = [
  {
    key: 'both_aa_or_higher',
    name: 'both charts have AA Rodden score',
  },
  { key: 'both_a_or_higher', name: 'both have A rating or better' },
  { key: 'both_b_or_higher', name: 'both have B rating or better' },
  { key: 'both_c_or_higher', name: 'both have C rating or better' },
  { key: 'both_any ', name: 'both can have any Rodden rating ' },
];

export const aspectConfigOptions = [
  {
    key: 'whole_sign',
    name: 'Sidereal Rāśis and Nakṣatras',
    options: [
      {
        key: 'linear',
        name: 'Use within sign/house linear ratio for score',
      },
      {
        key: 'hartdefouw_7_5_rule',
        name:
          'Use within Hart de Fouw 7.5 degree rule with sign/house linear ratio for score',
      },
    ],
  },
  {
    key: 'bhava_chalit',
    name: 'Use Bhava Chalit Houses instead of Whole Sign/House',
    options: [
      {
        key: 'linear',
        name: 'Use within house linear ratio for score',
      },
    ],
  },
  {
    key: 'orb',
    name: 'Use Orbed Aspects not limited by sign boundaries',
    options: [
      {
        key: 'linear',
        name: 'Use within orb linear ratio for score',
      },
      {
        key: 'tajik_diptamsha_orbs',
        name: 'Use Tajik Dīptāṃśa Orbs',
      },
      {
        key: 'custom_orbs',
        name: 'Use Custom Orb Settings',
      },
    ],
  },
];
