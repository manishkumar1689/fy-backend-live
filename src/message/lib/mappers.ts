export const messagePlaceholders = [
  { key: 'reset_link', name: 'Reset Link' },
  { key: 'reset_code', name: 'Reset code' },
  { key: 'full_name', name: 'Full name' },
  { key: 'nick_name', name: 'Nick name' },
  { key: 'email', name: 'Email' },
];

export const replaceMessagePlaceholders = (
  text: string,
  params: any = null,
): string => {
  const entries =
    params instanceof Map
      ? params
      : params instanceof Object
      ? Object.entries(params)
      : [];
  const paramMap: Map<string, any> = new Map(entries);
  let body = text.trim();
  messagePlaceholders.forEach(row => {
    if (paramMap.has(row.key)) {
      const repl = paramMap.get(row.key);
      if (typeof repl === 'string') {
        const rgx = new RegExp(
          '[#%]' + row.key.replace(/_/gi, '[-_]') + '\\b',
          'i',
        );
        body = body.replace(rgx, repl);
      }
    }
  });
  return body;
};
