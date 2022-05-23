export const compatibilityTexts = [
  'Elit pellentesque habitant morbi tristique senectus et netus. Eu facilisis sed odio morbi quis commodo',
  'Neque egestas congue quisque egestas diam in arcu cursus. Velit dignissim sodales ut eu',
  'Dignissim suspendisse in est ante. Dui nunc mattis enim ut tellus elementum sagittis vitae. Eu facilisis sed odio morbi quis commodo odio aenean sed.',
  'Dolor sit amet consectetur adipiscing. Dui faucibus in ornare quam viverra orci sagittis eu.',
  'Convallis aenean et tortor at risus viverra adipiscing at in. Etiam sit amet nisl purus in mollis nunc sed id.',
  'Nibh sit amet commodo nulla facilisi nullam vehicula ipsum. Sociis natoque penatibus et magnis dis parturient montes nascetur ridiculus',
  'Ullamcorper eget nulla facilisi etiam dignissim diam quis enim lobortis. Sodales neque sodales ut etiam',
  'Malesuada nunc vel risus commodo viverra. Id porta nibh venenatis cras sed felis eget. Nulla at volutpat diam ut venenatis tellus',
  'Nisi porta lorem mollis aliquam. Enim diam vulputate ut pharetra',
  'A diam maecenas sed enim ut. A diam sollicitudin tempor id eu. Risus in hendrerit gravida rutrum.',
  'Urna duis convallis convallis tellus. Blandit turpis cursus in hac. Pretium viverra suspendisse potenti nullam.',
  'Egestas tellus rutrum tellus pellentesque eu tincidunt tortor. Consectetur adipiscing elit ut aliquam purus.',
  'Pulvinar proin gravida hendrerit lectus a. Enim neque volutpat ac tincidunt vitae semper quis.',
  'Diam maecenas sed enim ut sem viverra aliquet eget. In hac habitasse platea dictumst',
];

export const randomCompatibilityText = () => {
  const numTexts = compatibilityTexts.length;
  const index = Math.floor(Math.random() * numTexts * 0.999999);
  return compatibilityTexts[index];
};
