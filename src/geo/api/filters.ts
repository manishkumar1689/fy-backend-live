import { Toponym } from '../interfaces/toponym.interface';
import { notEmptyString } from '../../lib/validators';
import { smartCastFloat } from '../../lib/converters';

export const filterDefaultName = (
  name: string,
  longName: string,
  fcode: string,
  countryCode: string,
) => {
  let str = name;
  switch (fcode) {
    case 'PCLI':
      switch (countryCode) {
        case 'GB':
        case 'UK':
          str = 'UK';
          break;
        case 'US':
        case 'USA':
          str = 'USA';
          break;
      }
      break;
    case 'ADM2':
      switch (countryCode) {
        case 'IS':
          str = '';
          break;
        default:
          str = longName;
          break;
      }
      break;
  }

  return str;
};

export const filterToponyms = (toponyms: Array<Toponym>, locality = '') => {
  const items = toponyms.filter(row => notEmptyString(row.name));
  const adm1Index = toponyms.findIndex(
    tp => tp.name.toLowerCase() === 'scotland',
  );
  if (adm1Index > 0) {
    return items.filter(tp => tp.type !== 'PCLI');
  } else {
    return items;
  }
};

export const correctOceanTz = (toponyms: Array<Toponym>, tz: number) => {
  let adjustedTz = tz;
  if (toponyms.length === 1) {
    const tp = toponyms[0];
    if (tp.type === 'SEA' && tz === 0 && (tp.lng > 7.5 || tp.lng < -7.5)) {
      if (/\bocean\b/i.test(tp.name)) {
        adjustedTz = Math.floor((tp.lng + 7.5) / 15) * 3600;
      }
    }
  }
  return adjustedTz;
};

export const googleGeoNameCodeMap = [
	{ key: 'administrative_area_level_1', code: 'ADM1' },
  { key: 'state', code: 'ADM1' },
  { key: 'province', code: 'ADM1' },
  { key: 'region', code: 'ADM1' },
  { key: 'administrative_area_level_2', code: 'ADM2' },
  { key: 'administrative_area_level_3', code: 'ADM3' },
  { key: 'administrative_area_level_4', code: 'ADM4' },
  { key: 'administrative_area_level_5', code: 'ADM5' },
  { key: 'colloquial_area', code: 'ADM2H' },
  { key: 'country', code: 'PCLI' },
  { key: 'locality', code: 'PPLL' },
  { key: 'city', code: 'PPLA' },
  { key: 'postal_town', code: 'PPLA2' },
  { key: 'town', code: 'PPLA2' },
  { key: 'sublocality', code: 'PPLX' },
  { key: 'sublocality_level_1', code: 'PPLX' },
  { key: 'sublocality_level_2', code: 'PPLX' },
  { key: 'sublocality_level_3', code: 'PPLX' },
  { key: 'sublocality_level_4', code: 'PPLX' },
  { key: 'sublocality_level_5', code: 'PPLX' },
  { key: 'small_town', code: 'PPLA3' }
];


export const toGeoNameCode = (key = "") => {
  const compKey = key.toLowerCase().replace(/[^a-z0-9_]+/, '_');
  const row = googleGeoNameCodeMap.find(row => row.key === compKey);
  return row instanceof Object ? row.code : 'PPLL';
}

export const matchGeoCode = (key = "") => {
  if (key.length < 6 && /^[A-Z]+[A-Z0-9]$/.test(key)) {
    return key;
  } else {
    return toGeoNameCode(key);
  }
}

export const mapExternalPlaceName = (row: any = null) => {
  const mp: Map<string, any> = new Map();
  if (row instanceof Object) {
    Object.entries(row).forEach(entry => {
      const [key, value] = entry;
      if (typeof value === 'string' || typeof value === 'number') {
        const compKey = key.toLowerCase().replace(/[_-]+/g, '');
        switch (compKey) {
          case 'name': 
          case 'shortname':
            mp.set('name', value.toString());
            break;
          case 'fullname':
          case 'longname':
          case 'long':
            mp.set('fullName', value.toString());
            break;
          case 'code':
          case 'key': 
          case 'type':
            mp.set('type', matchGeoCode(value.toString()));
            break;
          case 'lng': 
          case 'lat': 
            mp.set(key, smartCastFloat(value));
            break;
        }
      }
    });
    if (!mp.has('fullName')) {
      mp.set('fullName', mp.get('name'));
    }
  }
  return Object.fromEntries(mp.entries());
}