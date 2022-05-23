const roleValues = [
  {
    key: 'superadmin',
    name: 'Super administrator',
    overrides: [],
    adminAccess: true,
    appAccess: false, // would have to use a separate account
    permissions: ['all'],
  },
  {
    key: 'admin',
    name: 'Administrator',
    overrides: [],
    adminAccess: true,
    appAccess: false, // would have to use a separate account
    permissions: ['astrologic_testing', 'member_admin', 'dictionary_admin'],
    likes: {},
  },
  {
    key: 'boosted',
    name: 'Boosted user',
    overrides: [], // temporary profile
    adminAccess: false,
    appAccess: false,
    inherits: [],
    permissions: ['boosted_profile'],
  },
  {
    key: 'blocked',
    name: 'Blocked user',
    overrides: ['all'], // overrides any other roles for the duration of this status
    adminAccess: false,
    appAccess: false,
    inherits: [],
    permissions: [],
  },
  {
    key: 'active',
    name: 'Active member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    permissions: ['basic_search', 'basic_matching'],
  },
  {
    key: 'member_pearl',
    name: 'Pearl member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    inherits: ['active'],
    permissions: ['advanced_search', 'advanced_matching'],
  },
  {
    key: 'member_ruby',
    name: 'Ruby Member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    inherits: ['active', 'bronze'],
    permissions: ['highlighted_profile'],
  },

  {
    key: 'member_diamond',
    name: 'Diamond Member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    inherits: ['active', 'bronze'],
    permissions: ['unlimited'],
  },
];

export const filterLikeabilityKey = (key = '') => {
  switch (key) {
    case 'liked1':
      return {
        refNum: 1,
        gte: false,
      };
    case 'liked2':
    case 'superliked':
    case 'superstarred':
    case 'starred':
      return {
        refNum: 2,
        gte: false,
      };
    case 'passed':
      return {
        refNum: 0,
        gte: false,
      };
    case 'likeability':
    case 'likability':
      return {
        refNum: -3,
        gte: true,
      };
    default:
      return {
        refNum: 1,
        gte: true,
      };
  }
};

export default roleValues;
