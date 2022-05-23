import * as csv from 'csv-parser';
import * as stripBom from 'strip-bom-stream';
import * as fs from 'fs';
import { mediaPath, writeMediaFile } from './files';
import * as moment from 'moment-timezone';
import { calcJulDate, jdToDateTime } from '../astrologic/lib/date-funcs';
import { emptyString, notEmptyString, validISODateString } from './validators';
import {
  ChartInputDTO,
  SimplePlacename,
} from '../astrologic/dto/chart-input.dto';
import { PairedChartInputDTO } from '../astrologic/dto/paired-chart-input.dto';
import { sanitize } from './converters';
import { GeoDTO } from '../user/dto/geo.dto';

export interface RecordRelation {
  tags: string[];
  identifier: string;
  notes?: string;
}

export interface Record {
  identifier: string;
  source: string;
  fullName: string;
  nickName: string;
  gender: string;
  geo: any;
  dob: Date;
  jd: number;
  tz: string;
  tzOffset: number;
  relations: RecordRelation[];
  rodden: string;
  placenames: Array<SimplePlacename>;
  [key: string]: any;
}

const defaultRecord = {
  identifier: '',
  source: 'astro-databank',
  fullName: '',
  nickName: '',
  gender: '',
  rodden: '',
  dob: new Date('0000-00-00T00:00:00'),
  jd: 0,
  tz: '',
  tzOffset: 0,
  geo: { lat: 0, lng: 0 },
  placenames: [],
  relations: [],
};

const cleanAstroBankUrl = (url: string) => {
  return url
    .split('/astro-databank/')
    .pop()
    .replace(/(\w)\s+_([a-z])/i, '$1,_$2')
    .split(/\,\s+/)
    .shift();
};

const parseTzString = (value: string) => {
  const match = value.match(/\bh(\d+(\.\d+)?)([we])\b/i);
  let offset = 0;
  if (match) {
    const hours = parseFloat(match[1]);
    offset = hours * 60 * 60;
    switch (match[3]) {
      case 'w':
        offset = 0 - offset;
        break;
    }
  }
  return offset;
};

const tagKeys = [
  'one_night_stand',
  'short_romance',
  'lover',
  'lived_together',
  'spouse',
  'spousal_equivalent',
  'not_known',
];

const addRelation = (value: string, record: Record, categories = []) => {
  const segments = value.split(/https?:\/\//);
  if (segments.length > 1) {
    const link = cleanAstroBankUrl(segments[1]);
    const parts = segments[0].trim().split(/\s+/);
    const tagParts = [];
    const noteParts = [];
    let noteMode = false;
    let tagKey = '';
    parts.forEach(word => {
      if (word.toLowerCase() === 'notes:') {
        noteMode = true;
      } else {
        noteMode = tagKeys.includes(tagKey);
        if (noteMode) {
          noteParts.push(word);
        } else {
          tagParts.push(word);
          tagKey = tagParts.join('_');
        }
      }
    });
    if (typeof link === 'string') {
      const notes = noteParts.join(' ').replace(/notes:/i, ', ');
      const tag = tagParts.join(' ');
      const identifier = cleanAstroBankUrl(link);
      const tags = [tag, ...categories.filter(txt => notEmptyString(txt))];
      record.relations.push({ tags, notes, identifier });
    }
  }
};

const parseRodden = (txt: string) => {
  const rgx = /\b(([A-Z][A-Z]?[A-Z]?)(\/([A-Z][A-Z]?[A-Z]?))?)\b/;
  const match = txt.toUpperCase().match(rgx);
  let abbr = '';
  if (match) {
    if (match[4]) {
      abbr = match[4];
    } else if (match[2]) {
      abbr = match[2];
    }
  }
  return abbr;
};

const parseRecord = row => {
  const record: Record = Object.assign({}, defaultRecord);
  record.identifier = cleanAstroBankUrl(row.url);
  record.relations = [];
  const urlRgx = new RegExp('https://', 'i');
  let hasDob = false;
  let categories = [];
  Object.entries(row).forEach(entry => {
    const [key, value] = entry;
    const baseKey = key.replace(/_\d+$/, '');
    let placename = '';
    if (typeof value === 'string') {
      switch (baseKey.toLowerCase()) {
        case 'birthname':
          record.fullName = value.trim();
          break;
        case 'name_rows':
          record.nickName = value.trim();
          break;
        case 'name':
          record.nickName = value
            .split(',')
            .reverse()
            .join(' ')
            .trim()
            .replace(/\s\s+/g, ' ');
          break;
        case 'category':
          categories = value.split(',').map(txt =>
            txt
              .toLowerCase()
              .replace(/_+/g, ' ')
              .trim(),
          );
          break;
        case 'born_on':
          if (validISODateString(value)) {
            record.local = moment(value, moment.ISO_8601)
              .utc()
              .toISOString();
            hasDob = true;
          }
          break;
        case 'latlng':
          const [lat, lng] = value.split(',').map(parseFloat);
          record.geo = { lat, lng };
          record.coords = [lng, lat];
          break;
        case 'place':
          placename = value;
          break;
        case 'related_rows':
          if (value.length > 8 && urlRgx.test(value)) {
            addRelation(value, record, categories);
          }
          break;
        case 'timezone':
          record.tzOffset = parseTzString(value);
          break;
        case 'rodden':
          record.rodden = value.toUpperCase();
          break;
        case 'data_source':
          record.data_source = value;
          break;
        case 'gender':
          record.gender = value.toLowerCase();
          break;
        case 'collector':
          record.collector = value;
          break;
      }
    }
    if (placename.length > 1) {
      record.placenames = placename.split(/,\s*/).map((word, wi) => {
        const type = wi === 0 ? 'PPL' : 'PCLI';
        return {
          name: word.toString(),
          fullName: word.toString(),
          type,
          geo: record.geo as GeoDTO,
        };
      });
    }
    if (hasDob) {
      const utc = moment(row.born_on, moment.ISO_8601).subtract(
        record.tzOffset,
        'seconds',
      );
      record.dob = utc.toISOString();
      record.jd = calcJulDate(utc.toISOString());
    }
    if (notEmptyString(record.data_source)) {
      const rodden = parseRodden(record.data_source);
      if (notEmptyString(rodden)) {
        record.rodden = rodden;
      }
    }
  });
  return record;
};

export const parseAstroBankCSV = async () => {
  const startIndex = 40;
  const numPreview = 10;
  const path = mediaPath('sources') + 'test-records.csv';
  const result: Map<string, any> = new Map();
  result.set('valid', false);
  result.set('path', path);
  result.set('exists', fs.existsSync(path));
  const rows = [];
  await fs
    .createReadStream(path)
    .pipe(stripBom())
    .pipe(
      csv({
        mapHeaders: ({ header, index }) =>
          header.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      }),
    )
    .on('data', data => rows.push(data))
    .on('end', () => {
      //const endIndex = startIndex + numPreview;
      const records = rows.map(parseRecord);
      const identifiers = records.map(r => r.identifier);
      const unmatched = [];
      records.forEach(r => {
        r.relations.forEach(rr => {
          const relId = rr.identifier.split('#').shift();
          if (identifiers.indexOf(relId) < 0) {
            if (unmatched.indexOf(relId) < 0) {
              unmatched.push(relId);
            }
          }
        });
      });
      writeMediaFile('test-records.json', JSON.stringify(records), 'sources');
      writeMediaFile(
        'unmatched-records.json',
        JSON.stringify(unmatched),
        'sources',
      );
      result.set('records', rows.map(parseRecord));
    });

  return Object.fromEntries(result.entries());
};

export const fetchJsonRows = (fp: string): Array<any> => {
  if (fs.existsSync(fp)) {
    const raw = fs.readFileSync(fp);
    return raw instanceof Buffer ? JSON.parse(raw.toString()) : [];
  } else {
    return [];
  }
};

export const mapToChartInput = (rec: Record, userID: string): ChartInputDTO => {
  let bestName = rec.fullName;
  if (emptyString(bestName)) {
    bestName = rec.nickName;
    if (emptyString(bestName)) {
      bestName = rec.identifier;
    }
  }
  const placenames = rec.placenames.filter(pl => pl instanceof Object);
  return {
    user: userID,
    name: bestName,
    datetime: jdToDateTime(rec.jd),
    lat: rec.geo.lat,
    lng: rec.geo.lng,
    alt: 10,
    notes: rec.notes,
    type: 'person',
    isDefaultBirthChart: false,
    gender: rec.gender,
    eventType: 'birth',
    roddenScale: rec.rodden,
    placenames,
    tz: 'X/X',
    tzOffset: rec.tzOffset,
  } as ChartInputDTO;
};

export const mapPairedChartInput = (
  rec: Record,
  c1: string,
  c2: string,
  rel: any,
  userID: string,
) => {
  let strNotes = '';
  let arrTags = [];
  if (rel instanceof Object) {
    const { tags, notes } = rel;
    if (tags instanceof Array) {
      arrTags = tags.map(tg => {
        return {
          slug: sanitize(tg),
          name: tg,
        };
      });
    }
    if (notEmptyString(notes)) {
      strNotes = notes;
    }
  }
  return {
    user: userID,
    c1,
    c2,
    tags: arrTags,
    notes: strNotes,
    mode: 'median',
  } as PairedChartInputDTO;
};

export const parseAstroBankJSON = async () => {
  const fpSource = mediaPath('sources') + 'test-records.json';
  const fpRelated = mediaPath('sources') + 'related.json';
  const mp: Map<string, any> = new Map();
  const sourceRows = fetchJsonRows(fpSource);
  const numSourceRows = sourceRows.length;
  mp.set('numSourceRows', numSourceRows);

  const relatedRows = fetchJsonRows(fpRelated);
  mp.set('numRelatedRows', relatedRows.length);
  const rows = [];
  for (let i = 0; i < sourceRows.length; i++) {
    const rec = sourceRows[i];
    rows.push(rec);
    if (rec.relations instanceof Array) {
      rec.relations.forEach(rel => {
        const mr = relatedRows.find(r => r.url === rel.identifier);
        if (mr) {
          rows.push(parseRecord(mr));
        }
      });
    }
  }
  mp.set('rows', rows);
  mp.set('numRows', rows.length);
  return mp;
};
