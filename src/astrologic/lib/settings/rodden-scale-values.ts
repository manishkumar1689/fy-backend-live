const roddenScaleValues = [
  {
    value: 50,
    key: 'AAA',
    enabled: true,
    name: 'Highly accurate',
    description: `Birthtime (moment the baby leaves the mother's body and/or time of first breath) clocked to the second with a highly accurate clock`,
  },
  {
    value: 100,
    key: 'AA',
    enabled: true,
    name: 'Recorded time',
    description: `"Data as recorded by the family or state. This includes BC (birth certificate), and BR (birth record), that which is not an official document but a quote of the birth record from the Registrar or Bureau of Records, the baptismal certificate, family Bible, or baby book. These data reflect the best available accuracy.Taeger data groups: 1*,1F"`,
  },
  {
    value: 150,
    key: 'AAR',
    enabled: true,
    name: 'Rectified from recorded time',
    description: `Rectified time from a recorded time`,
  },
  {
    value: 200,
    key: 'A',
    enabled: true,
    name: 'Fairly Accurate',
    description: `"Data as quoted by the person, kin, friend, or associate. These data all come from someone's memory, family legend, or hearsay. "`,
  },
  {
    value: 250,
    key: 'AR',
    name: 'Rectified from quoted time',
    description: `Rectified time from a quoted time (memory or otherwise)`,
  },
  {
    value: 300,
    key: 'B',
    enabled: true,
    name: 'Biography',
    description: `Biography or autobiography. When these data are substantiated by a quote that qualifies the information, they are considered reliable.`,
  },
  {
    value: 350,
    key: 'BR',
    enabled: true,
    name: 'Rectified from biography time',
    description: `Rectified time from a time given in a biography or newspaper (?)`,
  },
  {
    value: 400,
    key: 'C',
    name: 'Caution',
    description: `"Caution, no source. These data are also listed as ""OSNK, Original Source Not Known"". They are undocumented data, often given in magazines or journals, with no source, or an ambiguous source such as ""personal"" or ""archives."""`,
  },
  {
    value: 450,
    key: 'CR',
    name: 'Rectified from cautious time',
    description: `Rectified time from a cautious time`,
  },
  {
    value: 500,
    key: 'DD',
    name: 'Dirty Data',
    description: `Two or more conflicting quotes that are unqualified. These data are offered as a reference in order to document their lack of reliability and prevent their being presented elsewhere as factual.`,
  },
  {
    value: 550,
    key: 'DDR',
    name: 'Rectified from confilicting time info',
    description: `Rectified time from conflicting and unqualified time`,
  },
  {
    value: 730,
    key: 'AX',
    enabled: true,
    name: 'Documented untimed source',
    description: `Records without a time, such as church records, etc. (same as AAX???)`,
  },
  {
    value: 900,
    key: 'R',
    enabled: true,
    name: 'Rectified from unspecified ',
    description: `Rectified time from unspecified data rating. Rectified times that don't start from an approximate time`,
  },
  {
    value: 999,
    key: 'AAX',
    enabled: true,
    name: 'Official untimed source',
    description: `Date from an official source, but no time (??? Same as AX ???)`,
  },
  {
    value: 1000,
    key: 'X',
    enabled: true,
    name: 'No known time',
    description: `Data with no time of birth. Untimed data may be of interest in the examination of planetary patterns. (not for rectified time as it used to)`,
  },
  {
    value: 1010,
    key: 'XR',
    name: 'Rectified from know date / unknown time',
    description: `Rectified time from unknown time, with only date known`,
  },
  {
    value: 1020,
    key: 'XXR',
    enabled: true,
    name: 'Rectified from no date/time knowledge',
    description: `"Rectified date and time from unknown date and time (like Jesus, Buddha, etc)"`,
  },
  {
    value: 1050,
    key: 'XX',
    name: 'No known date/time',
    description: `Data without a known or confirmed date. Historic figures or certain current news figures may be of interest even with speculative birth dates.`,
  },
];

export const mergeRoddenValue = (item: any) => {
  const { value, key } = item;
  if (typeof value !== 'number') {
    const defaultItem = roddenScaleValues.find(ri => ri.key === key);
    if (defaultItem instanceof Object) {
      item.value = defaultItem.value;
    }
  }
  return item;
};

export const mergeRoddenValues = (items: Array<any>) => {
  return items.filter(item => item instanceof Object).map(mergeRoddenValue);
};

export const matchRoddenKeyValue = (longKey: string) => {
  const parts = longKey.split('_');
  const roddenKey = parts.pop().toUpperCase();
  let comparison = '$lte';
  let mode = 'both';
  if (parts.length > 0) {
    const compKey = parts.pop().toLowerCase();
    switch (compKey) {
      case 'lt':
        comparison = '$gt';
        break;
      case 'gt':
        comparison = '$lt';
        break;
      case 'gte':
        comparison = '$lte';
        break;
      case 'lte':
        comparison = '$gte';
        break;
      case 'eq':
        comparison = '$eq';
        break;
    }
  }
  let value = 1000;
  const row = roddenScaleValues.find(item => item.key === roddenKey);
  if (row instanceof Object) {
    value = row.value;
  }
  return { key: roddenKey, mode, comparison, value };
};

export default roddenScaleValues;
