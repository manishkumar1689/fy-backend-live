/*
These permissions are enforced in code. The value list is for reference in the admin area
*/

const permissionValues = [
  {
    key: 'all',
    name: 'Global permissions',
  },
  {
    key: 'users_admin',
    name: 'Administer users',
  },
  {
    key: 'astrologic_testing',
    name: 'astrologic testing'
  },
  {
    key: 'edit_protocols',
    name: 'Edit Protocols'
  },
  {
    key: 'basic_account',
    name: 'Basic account',
  },
  {
    key: 'basic_image_upload',
    name: 'May upload up to %d images for public profiles',
  },
  {
    key: 'extended_image_uploads',
    name: 'May upload up to %d images per profile type',
  },
  {
    key: 'premium_image_uploads',
    name: 'Premium uploads',
  },
  {
    key: 'protected_profiles',
    name: 'May have protected profile only available to mutual likes',
  },
  
  { key: 'basic_swipe_pass', name: 'Basic swipe pass limit' },
  { key: 'extended_swipe_pass', name: 'Extended pass limit' },
  { key: 'premium_swipe_pass', name: 'Premium pass limit' },
  { key: 'basic_swipe_like', name: 'Basic swipe like limit' },
  { key: 'extended_swipe_like', name: 'Extended swipe like limit' },
  { key: 'premium_swipe_like', name: 'Premium swipe like limit' },
  { key: 'basic_swipe_superstar', name: 'swipe superstar limit' },
  { key: 'extended_swipe_superstar', name: 'extended swipe superstar limit' },
  { key: 'premium_swipe_superstar', name: 'premium swipe superstar limit' },
  { key: 'swipe_superstar_message', name: 'swipe superstar message' },
  { key: 'swipe_like_message', name: 'swipe like message' },
  { key: 'basic_swipe_like_promote', name: 'swipe like promote' },
  { key: 'extended_swipe_promote_me', name: 'Swipe promote me limit' },
  { key: 'info_who_likes_me', name: 'Info: see who likes me' },
  { key: 'info_history', name: 'Info history access' },
  {
    key: 'compatibility_manual',
    name: 'manual compatibility access'
  },
  { key: 'compatibility_astro_text', name: 'Astro compatibility text' },
  {
    key: 'compatibility_jungian_text',
    name: 'compatibility jungian text'
  },
  {
    key: 'compatibility_big5_text',
    name: 'big Five compatibility text'
  },
  {
    key: 'swipe_luckystar_strength_access',
    name: 'Swipe luckystar strength access'
  },
  { key: 'connecting_others_access', name: 'Connecting others access' },
  { key: 'astro_luckystar_access', name: 'Astro Lucky Star access' },
  { key: 'chat_message_access', name: 'chat message access' },
  { key: 'chat_video_access', name: 'chat video access' },
  { key: 'basic_outside_range', name: 'Basic outside range limit' },
  { key: 'extended_outside_range', name: 'Extended outside range limit' },
  {
    key: 'astro_current_trends_text',
    name: 'Astro current trends text'
  },
  { key: 'astro_natal_chart_text', name: 'astro natal chart text' }
];

export const limitPermissions = [
  { key: 'basic_image_upload', value: 3 },
  { key: 'extended_image_uploads', value: 20 },
  { key: 'premium_image_uploads', value: 100 },
  { key: 'basic_swipe_pass', value: 25 },
  { key: 'extended_swipe_pass', value: 100 },
  { key: 'premium_swipe_pass', value: 1000 },
  { key: 'basic_swipe_like', value: 25 },
  { key: 'extended_swipe_like', value: 100 },
  { key: 'premium_swipe_like', value: 1000 },
  { key: 'basic_swipe_superstar', value: 1 },
  { key: 'extended_swipe_superstar', value: 25 },
  { key: 'premium_swipe_superstar', value: 100 },
  { key: 'basic_swipe_like_promote', value: 25 },
  { key: 'extended_swipe_promote_me', value: 50 },
  { key: 'basic_outside_range', value: 100 },
  { key: 'extended_outside_range', value: 1000 }
]

export default permissionValues;
