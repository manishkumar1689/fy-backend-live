import { Injectable, HttpService } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { geonames, timezonedb, googleGeo } from '../.config';
import { geonamesApiBase, timezonedbApiBase } from './api';
import { objectToQueryString, mapToQueryString } from '../lib/converters';
import { AxiosResponse } from 'axios';
import * as moment from 'moment-timezone';
import {
  notEmptyString,
  isNumeric,
  validISODateString,
  emptyString,
} from '../lib/validators';
import {
  filterDefaultName,
  filterToponyms,
  correctOceanTz,
  mapExternalPlaceName,
} from './api/filters';
import { GeoPos } from '../astrologic/interfaces/geo-pos';
import {
  extractFromRedisClient,
  extractFromRedisMap,
  storeInRedis,
} from '../lib/entities';
import * as Redis from 'ioredis';
import { RedisService } from 'nestjs-redis';
import { GeoName } from './interfaces/geo-name.interface';
import {
  generateNameSearchRegex,
  toLocationString,
} from '../astrologic/lib/helpers';
import { Toponym } from '../astrologic/lib/interfaces';
import { toShortTzAbbr } from '../astrologic/lib/date-funcs';

@Injectable()
export class GeoService {
  constructor(
    @InjectModel('GeoName') private readonly geoNameModel: Model<GeoName>,
    private http: HttpService,
    private readonly redisService: RedisService,
  ) {}

  getHttp(url: string): Promise<AxiosResponse> {
    return this.http.get(url).toPromise();
  }

  async redisClient(): Promise<Redis.Redis> {
    const redisMap = this.redisService.getClients();
    return extractFromRedisMap(redisMap);
  }

  async redisGet(key: string): Promise<any> {
    const client = await this.redisClient();
    return await extractFromRedisClient(client, key);
  }

  async redisSet(key: string, value): Promise<boolean> {
    const client = await this.redisClient();
    return await storeInRedis(client, key, value);
  }

  async fetchGeoNames(method: string, params: any) {
    let queryParams: any = {};
    let queryString = '';
    let result: any = { valid: false };
    if (params instanceof Object) {
      queryParams = { username: geonames.username, ...params };
      queryString = objectToQueryString(queryParams);
    }
    const url = [geonamesApiBase, method].join('/') + queryString;
    await this.getHttp(url).then(response => {
      if (response instanceof Object) {
        const { data } = response;
        if (data instanceof Array) {
          result = { valid: true, values: data };
        } else if (data instanceof Object) {
          result = { valid: true, ...data };
        }
      }
    });
    return result;
  }

  async fetchGeoData(lat: number, lng: number) {
    const coords = { lat, lng };
    let data = await this.fetchGeoNames('extendedFindNearbyJSON', coords);
    if (data.valid) {
      const tzData = await this.fetchGeoNames('timezoneJSON', coords);
      if (tzData.valid) {
        const { ocean, address } = data;
        let { geonames } = data;
        const { countryCode, countryName, timezoneId } = tzData;
        const excludeTypes = ['AREA', 'ADM3'];
        let toponyms = [];
        const hasToponyms = geonames instanceof Array && geonames.length;
        if (!hasToponyms && address instanceof Object) {
          const keyMap = {
            adminName1: 'ADM1',
            adminName2: 'ADM2',
            placename: 'PPLL',
            street: 'STRT',
            postalcode: 'PSCD',
          };
          geonames = Object.entries(keyMap)
            .filter(entry => {
              const [k, v] = entry;
              let valid = address.hasOwnProperty(k);
              if (valid) {
                valid = notEmptyString(address[k]);
              }
              return valid;
            })
            .map(entry => {
              const [key, fcode] = entry;
              const name = address[key];
              return {
                lat,
                lng,
                name,
                toponymName: name,
                fcode,
              };
            });
        }
        if (geonames instanceof Array) {
          if (geonames.length > 2) {
            excludeTypes.push('CONT');
          }
          toponyms = geonames
            .filter(gn => !excludeTypes.includes(gn.fcode))
            .map(row => {
              return {
                name: filterDefaultName(
                  row.name,
                  row.toponymName,
                  row.fcode,
                  countryCode,
                ),
                fullName: row.toponymName,
                type: row.fcode,
                lat: parseFloat(row.lat),
                lng: parseFloat(row.lng),
              };
            });
        } else if (ocean instanceof Object) {
          const { name } = ocean;
          toponyms = [
            {
              name,
              fullName: name,
              type: 'SEA',
              lat,
              lng,
            },
          ];
        }

        const zd = {
          countryName,
          cc: countryCode,
          tz: timezoneId,
        };
        data = {
          ...zd,
          toponyms: filterToponyms(toponyms),
        };
      }
    }
    return data;
  }

  matchStandardTzOffset(tz: string, year = 2000) {
    const defVal = -86400;
    switch (tz) {
      case 'Asia/Kolkata':
        return year >= 1946 ? 19800 : defVal;
      case 'Asia/Shanghai':
      case 'Asia/Beijing':
      case 'Asia/Hong_Kong':
      case 'Asia/Macau':
        return year >= 1949 ? 28800 : defVal;
      case 'Asia/Tokyo':
        return year >= 1952 ? 32400 : defVal;
      default:
        return defVal;
    }
  }

  /* processGooglePlaces(places: any[] = [], lat = 0, lng = 0) {
    const mapGooglePlace = (place) => {
      
    }
    return places instanceof Array? places.filter(pl => pl instanceof Object).map(mapGooglePlace) : [];
  } */

  async fetchGeoAndTimezone(
    lat: number,
    lng: number,
    datetime: string,
    mode = 'standard',
  ) {
    const data = await this.fetchGeoData(lat, lng);
    const offset = this.checkLocaleOffset(data.tz, datetime, data.toponyms);
    const shortTz = toShortTzAbbr(datetime, data.tz);
    const { countryName, cc, tz, toponyms } = data;
    const obj: any =
      mode === 'compact'
        ? { countryName, cc, tz, location: toLocationString(toponyms) }
        : { countryName, cc, tz, toponyms };
    return { ...obj, offset, shortTz };
  }

  checkLocaleOffset(
    timeZone: string,
    datetime: string,
    toponyms: Toponym[] = [],
  ) {
    const offset = this.checkGmtOffset(timeZone, datetime);
    return correctOceanTz(toponyms, offset);
  }

  async fetchTzData(coords: GeoPos, datetime: string, skipRemote = false) {
    const tz = await this.fetchGeoNames('timezoneJSON', coords);
    const { timezoneId } = tz;
    const key = ['tzdb', timezoneId, datetime.split(':').shift()].join('_');
    const storedTzData = await this.redisGet(key);
    let tzoData: any = {
      tz: tz.timezoneId,
      tzOffset: 0,
      valid: false,
    };
    const isValidTimezoneDBPayload = payload =>
      payload instanceof Object && Object.keys(payload).includes('offset');
    let valid = isValidTimezoneDBPayload(storedTzData);
    let tzOffset = 0;
    if (valid) {
      tzoData = storedTzData;
      tzOffset = tzoData.offset;
    } else {
      if (skipRemote) {
        tzOffset = this.checkGmtOffset(tz.timezoneId, datetime);
        valid = true;
      } else {
        tzoData = await this.fetchTimezoneOffset(timezoneId, datetime);
        valid = isValidTimezoneDBPayload(tzoData);
        if (valid) {
          this.redisSet(key, tzoData);
          tzOffset = tzoData.offset;
        } else {
          tzOffset = this.checkGmtOffset(tz.timezoneId, datetime);
        }
      }
    }
    const keys = Object.keys(tz);
    if (keys.includes('timezoneId') === false) {
      tzOffset = Math.floor((coords.lng + 7.5) / 15) * 3600;
    }
    return {
      tz: tz.timezoneId,
      tzOffset,
      valid,
    };
  }

  async fetchTimezoneOffset(zoneRef: any, datetime: string) {
    const params = new Map<string, any>();
    params.set('key', timezonedb.apiKey);
    params.set('format', 'json');
    const addLatLng = (params: Map<string, any>, lat: number, lng: number) => {
      params.set('lat', lat);
      params.set('lng', lng);
      params.set('by', 'position');
    };
    if (zoneRef instanceof Array) {
      const nums = zoneRef.filter(isNumeric).map(parseFloat);
      if (nums.length > 1) {
        const [lat, lng] = nums;
        addLatLng(params, lat, lng);
      }
    } else if (zoneRef instanceof Object) {
      const { lat, lng } = zoneRef;
      if (isNumeric(lat) && isNumeric(lng)) {
        addLatLng(params, parseFloat(lat), parseFloat(lng));
      }
    } else if (notEmptyString(zoneRef, 4)) {
      params.set('zone', zoneRef);
      params.set('by', 'zone');
    }
    const dp = datetime.split('T');
    let time = '12:00:00';
    const date = dp[0];
    if (dp.length > 1 && /^\d\d?:\d\d*/.test(dp[1])) {
      time = dp[1].split(':').shift() + ':00:00';
    }
    const dt =
      date === 'NOW' ? moment.utc() : moment.utc([date, time].join('T'));
    const ts = parseInt(dt.format('x')) / 1000;
    let result: any = { valid: false };
    params.set('time', ts);
    const url = timezonedbApiBase + mapToQueryString(params);
    await this.getHttp(url).then(response => {
      if (response instanceof Object) {
        const { data } = response;
        if (data instanceof Array) {
          result = { valid: true, values: data };
        } else if (data instanceof Object) {
          const endTs =
            data.dstEnd > 1000
              ? data.dstEnd * 1000
              : new Date().getTime() + 100 * 365.25 * 24 * 60 * 60 * 1000;
          if (data.status === 'FAILED') {
            if (zoneRef instanceof Object) {
              data.gmtOffset = Math.floor((zoneRef.lng + 7.5) / 15) * 3600;
            }
          }
          result = {
            valid: true,
            offset: data.gmtOffset,
            zone: data.zoneName,
            start: moment(data.dstStart * 1000),
            end: moment(endTs),
            dt: data.formatted,
          };
        }
      }
    });
    return result;
  }

  checkGmtOffset(zoneName: string, datetime: any): number {
    let gmtOffset = 0;
    if (notEmptyString(zoneName, 4)) {
      const year = validISODateString(datetime)
        ? parseInt(datetime.split('-').shift())
        : 2000;
      const standardHGmtOffset = this.matchStandardTzOffset(zoneName, year);
      if (standardHGmtOffset > -86400) {
        gmtOffset = standardHGmtOffset;
      } else {
        const mom = moment.utc(datetime).tz(zoneName);
        const parts = mom.format('Z').split(':');
        if (parts.length > 1) {
          const hrs = parseInt(parts[0].replace('+', '')) * 3600;
          const mins = parseInt(parts[1]) * 60;
          gmtOffset = hrs + mins;
        }
      }
    }
    return gmtOffset;
  }

  async searchByFuzzyAddress(
    placename: string,
    geo: any = null,
    skipStored = false,
  ) {
    const records = !skipStored ? await this.matchStoredGeoName(placename) : [];
    const data = { valid: false, items: [] };
    const numStored = records.length;
    if (numStored > 0) {
      data.valid = true;
      data.items = records;
    }
    if (numStored < 3 && (placename.length < 12 || numStored < 1)) {
      const newData = await this.searchByFuzzyAddressRemote(placename, geo);
      if (newData.valid) {
        data.items = data.items.concat(newData.items);
        data.valid = data.items.length > 0;
      }
    }
    return data;
  }

  buildAltNames(name = '', placename = '') {
    const altNames = [];
    const nameLength = name.length;
    const searchLength = placename.length;
    const minAltNameLength = 2;
    if (searchLength >= minAltNameLength) {
      const name = placename.toLowerCase().trim();
      const weight = (nameLength - name.length) * 10;
      altNames.push({
        name,
        type: 'partial',
        weight,
      });
    }
    return altNames;
  }

  async searchByFuzzyAddressRemote(placename: string, geo: any = null) {
    const params: Map<string, any> = new Map();
    params.set('input', encodeURIComponent(placename));
    params.set('key', googleGeo.apiKey);
    const qStr = mapToQueryString(params);
    const url =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json' + qStr;
    const output = { valid: false, items: [], url };
    await this.getHttp(url).then(async response => {
      if (response) {
        const { data } = response;
        if (data instanceof Object) {
          output.items = await this.extractSuggestedItems(data, placename);
          output.items.sort((a, b) => b.pop - a.pop);
          output.valid = output.items.length > 0;
        }
      }
    });
    if (!output.valid) {
      output.items = await this.searchByPlaceName(placename);
      output.valid = output.items.length > 0;
      if (output.valid) {
        for (const gItem of output.items) {
          this.saveGeoName(gItem);
        }
      }
    }
    if (output.valid) {
      if (output.items instanceof Array && output.items.length > 0) {
        for (const item of output.items) {
          const altNames = this.buildAltNames(item.name, placename);
          const cData = await this.fetchGeoData(item.lat, item.lng);
          if (cData.valid && cData.toponyms.length > 0) {
            const country = cData.toponyms[0].name;
            this.saveGeoName({ ...item, altNames, fcode: item.type, country });
          }
        }
      }
    }
    return output;
  }

  async matchStoredGeoName(search: string) {
    const searchPattern = generateNameSearchRegex(search);
    const letterRgx = new RegExp('^' + searchPattern, 'i');
    const orConditions: any[] = [{ 'altNames.name': letterRgx }];
    if (search.length > 4) {
      const nameRgx = new RegExp('\\b' + searchPattern, 'i');
      orConditions.push({ name: nameRgx });
    }
    const criteria = { $or: orConditions };
    const records = await this.geoNameModel

      .find(criteria)
      .select({
        _id: 0,
        region: 1,
        country: 1,
        fcode: 1,
        lat: 1,
        lng: 1,
        pop: 1,
        name: 1,
        fullName: 1,
      })
      .sort({ pop: -1 });
    return records;
  }

  async saveGeoName(inData = null) {
    if (inData instanceof Object) {
      const records = await this.geoNameModel.find({
        name: inData.name,
        lng: inData.lng,
        lat: inData.lat,
      });
      const keys = Object.keys(inData);

      if (keys.includes('type') && keys.includes('fcode') === false) {
        inData.fcode = inData.type;
        delete inData.type;
      }
      if (emptyString(inData.fcode)) {
        inData.fcode = 'PPLL';
      }
      if (records.length < 1) {
        const newGN = new this.geoNameModel(inData);
        newGN.save();
      } else {
        const { altNames } = inData;
        if (altNames.length > 0) {
          const first = records[0];
          const newAltNames =
            first.altNames instanceof Array ? first.altNames : [];
          altNames.forEach(altName => {
            if (
              newAltNames.some(
                an => an.name.toLowerCase() === altName.name.toLowerCase(),
              ) === false
            ) {
              newAltNames.push(altName);
            }
          });
          this.geoNameModel
            .findByIdAndUpdate(first._id, {
              altNames: newAltNames,
            })
            .exec();
        }
      }
    }
  }

  mapGooglePrediction(pred: any = null, lat = 0, lng = 0) {
    const [name, region, country] = pred.description.split(', ');
    return {
      region,
      country,
      fcode: 'PPL',
      lat,
      lng,
      pop: 0,
      name,
      fullName: name,
    };
  }

  async extractSuggestedItems(data = null, placename = '') {
    const items = [];
    const placeTypes = ['locality', 'postal_town'];
    if (data instanceof Object) {
      const rgx = RegExp('\\b' + placename, 'i');
      const { predictions } = data;

      if (predictions instanceof Array) {
        const placeIds: string[] = [];
        for (const pred of predictions) {
          const predKeys = Object.keys(pred);
          if (
            predKeys.includes('description') &&
            predKeys.includes('types') &&
            predKeys.includes('place_id')
          ) {
            if (
              pred.types instanceof Array &&
              placeIds.includes(pred.place_id) === false
            ) {
              placeIds.push(pred.place_id);
              if (pred.types.some(type => placeTypes.includes(type))) {
                const pl = await this.getPlaceByGooglePlaceId(pred.place_id);
                if (pl instanceof Object) {
                  if (Object.keys(pl).includes('address_components')) {
                    const { geometry } = pl;
                    const { lat, lng } = geometry.location;
                    if (pl.address_components instanceof Array) {
                      const matchedItems = pl.address_components.map(row =>
                        mapExternalPlaceName({
                          name: row.long_name,
                          lat,
                          lng,
                          type: row.types[0],
                        }),
                      );
                      const lastIndex = matchedItems.length - 1;
                      if (lastIndex > 0) {
                        const firstItem = matchedItems[0];
                        const cc = matchedItems[lastIndex].name;
                        const rg =
                          lastIndex > 1 ? matchedItems[lastIndex - 1].name : '';
                        const altNames = this.buildAltNames(
                          firstItem.name,
                          placename,
                        );
                        const newItem = {
                          ...firstItem,
                          fcode: firstItem.type,
                          country: cc,
                          region: rg,
                          altNames,
                        };
                        items.push(newItem);
                        this.saveGeoName(newItem);
                      }
                    }
                  }
                }
              }
            }
          } else if (predKeys.includes('structured_formatting')) {
            const results = await this.searchByPlaceName(
              pred.structured_formatting.main_text,
              '',
              0,
              20,
            );
            if (results instanceof Array && results.length > 0) {
              for (const item of results) {
                if (rgx.test(item.fullName) && item.pop > 0) {
                  const isAdded = items.some(pl => {
                    return pl.lng === item.lng && pl.lat === item.lat;
                  });
                  if (!isAdded) {
                    items.push(item);
                  }
                }
              }
            }
          }
        }
      }
    }
    return items;
  }

  async getPlaceByGooglePlaceId(placeId: string) {
    const params: Map<string, any> = new Map();
    params.set('place_id', placeId);
    params.set('fields', 'address_components,geometry');
    params.set('key', googleGeo.apiKey);
    const qStr = mapToQueryString(params);
    const url =
      'https://maps.googleapis.com/maps/api/place/details/json' + qStr;
    let output: any = { valid: false };
    await this.getHttp(url).then(response => {
      if (response) {
        const { data } = response;
        if (data instanceof Object) {
          const { result } = data;
          if (result instanceof Object) {
            output = result;
          }
        }
      }
    });
    return output;
  }

  normalizeGoogleRegionCode(compStr = '') {
    switch (compStr) {
      case 'UK':
        return 'GB';
      case 'USA':
        return 'US';
      case 'gb':
        return 'uk';
      case 'usa':
        return 'usa';
      case 'USA':
        return 'US';
      default:
        return compStr;
    }
  }

  matchGoogleRegionCode(code = '') {
    const codeStr = typeof code === 'string' ? code.trim() : '';
    const isCountryCode = /^[A-Z][A-Z]$/.test(codeStr);
    const compStr = isCountryCode ? code : code.toLocaleLowerCase();
    return {
      code: this.normalizeGoogleRegionCode(compStr),
      regionType: isCountryCode ? 'country' : 'region',
    };
  }

  async googleNearby(nearby = '', regionCode = '') {
    const key = googleGeo.apiKey;
    const { code, regionType } = this.matchGoogleRegionCode(regionCode);
    const extraParams = notEmptyString(code)
      ? `&components=${regionType}:${code}`
      : '';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${nearby}${extraParams}&key=${key}`;
    const output: any = { valid: false, results: [] };
    await this.getHttp(url).then(response => {
      if (response) {
        const { data } = response;
        if (data instanceof Object) {
          const { results } = data;
          if (results instanceof Array) {
            output.results = results;
          }
        }
      }
    });
    return output;
  }

  async searchByPlaceName(placename: string, cc = '', fuzzy = 1, max = 20) {
    const mp = new Map<string, string>();
    mp.set('q', decodeURI(placename));
    if (notEmptyString(cc)) {
      mp.set('countryBias', cc.toUpperCase());
    }
    if (fuzzy > 0) {
      mp.set('fuzzy', fuzzy.toString());
    }
    if (max > 0) {
      mp.set('maxRows', max.toString());
    }
    const items = [];
    const data = await this.fetchGeoNames('searchJSON', Object.fromEntries(mp));
    const fcs = [
      'PPL',
      'PPLX',
      'PPLA',
      'PPLA1',
      'PPLA2',
      'PPLA3',
      'PPLC',
      'ADM3',
    ];
    if (data instanceof Object) {
      const { geonames } = data;
      const keys: Array<string> = [];
      if (geonames instanceof Array) {
        geonames
          .filter(tp => fcs.includes(tp.fcode))
          .forEach(fc => {
            const {
              lat,
              lng,
              name,
              toponymName,
              adminName1,
              countryName,
              population,
              fcode,
            } = fc;
            let country = countryName;
            let region = adminName1;
            switch (fc.countryCode) {
              case 'US':
              case 'USA':
                country = 'USA';
                break;
              case 'GB':
              case 'UK':
                country = 'UK';
                break;
            }
            const regSlug = fc.adminName1.toLowerCase();
            switch (regSlug) {
              case 'scotland':
              case 'wales':
              case 'northern ireland':
              case 'england':
                country = adminName1;
                region = '';
                break;
            }
            const key = [toponymName, region, country].join(' ').toLowerCase();
            if (!keys.includes(key)) {
              keys.push(key);
              items.push({
                lat,
                lng,
                name,
                fullName: toponymName,
                region,
                country,
                pop: population,
                fcode,
              });
            }
          });
      }
      items.sort((a, b) => b.pop - a.pop);
    }
    return items;
  }
}
