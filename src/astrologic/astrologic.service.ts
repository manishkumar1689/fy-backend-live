import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { BodySpeed } from './interfaces/body-speed.interface';
import { Chart } from './interfaces/chart.interface';
import { BodySpeedDTO } from './dto/body-speed.dto';
import {
  calcAcceleration,
  calcAscendantKakshaSet,
  calcAscendantTimelineSet,
  calcCoreKakshaTimeline,
  calcCoreSignTimeline,
  calcStation,
  SignTimelineSet,
} from './lib/astro-motion';
import { subtractLng360 } from './lib/math-funcs';
import grahaValues, { matchPlanetNum } from './lib/settings/graha-values';
import roddenScaleValues, {
  matchRoddenKeyValue,
} from './lib/settings/rodden-scale-values';
import {
  addOrbRangeMatchStep,
  buildChartLookupPath,
  buildLngRanges,
  buildPairedChartLookupPath,
  buildPairedChartProjection,
  unwoundChartFields,
  yearSpanAddFieldSteps,
} from './../lib/query-builders';
import {
  applyTzOffsetToDateString,
  calcJulDate,
  calcJulDateFromParts,
  dtStringToNearest15Minutes,
  julToISODateObj,
  zero2Pad,
} from './lib/date-funcs';
import {
  emptyString,
  inRange,
  isNumber,
  isNumeric,
  notEmptyString,
  validISODateString,
} from '../lib/validators';
import { CreateChartDTO } from './dto/create-chart.dto';
import moment = require('moment');
import { PairedChartDTO } from './dto/paired-chart.dto';
import { PairedChart } from './interfaces/paired-chart.interface';
import { mapPairedCharts, mapSubChartMeta } from './lib/mappers';
import { RedisService } from 'nestjs-redis';
import {
  extractFromRedisClient,
  extractFromRedisMap,
  storeInRedis,
} from '../lib/entities';
import * as Redis from 'ioredis';
import { SimpleTransition } from './interfaces/simple-transition.interface';
import {
  matchDefaultVocabOptionKeys,
  SlugNameVocab,
  matchVocabKey,
} from './lib/settings/vocab-values';
import {
  calcAllAspects,
  calcAspectMatches,
  calcAyanamsha,
  calcCompactChartData,
  calcCoreGrahaPositions,
} from './lib/core';
import { Chart as ChartClass } from './lib/models/chart';
import { Kuta, KutaValueSetItems } from './lib/kuta';
import { AspectSet, buildDegreeRange, buildLngRange } from './lib/calc-orbs';
import {
  sanitize,
  smartCastInt,
} from '../lib/converters';
import { KeyValue } from './interfaces/key-value';
import { TagDTO } from './dto/tag.dto';
import {
  shortenName,
  generateNameSearchRegex,
  calcCoordsDistance,
} from './lib/helpers';
import { calcTropicalAscendantDt } from './lib/calc-ascendant';
import { GeoLoc } from './lib/models/geo-loc';
import { LngLat } from './lib/interfaces';
import { addExtraPanchangaNumValuesFromClass, simplifyChart } from './lib/member-charts';
import { getAshtakavargaBodyGrid } from './lib/settings/ashtakavarga-values';
import { GeoPos } from './interfaces/geo-pos';
import { ProgressItemDTO } from './dto/progress-item.dto';
import { buildSingleProgressSetKeyValues, calcProgressAspectDataFromProgressItems, calcProgressAspectsFromJds, calcProgressSummary, progressItemsToDataSet } from './lib/settings/progression';
import { currentJulianDay } from './lib/julian-date';
import { filterCorePreference } from '../lib/mappers';
import { mapLikeabilityRelations, UserFlagSet } from '../lib/notifications';
import { User } from '../user/interfaces/user.interface';
import { KeyNumValue } from '../lib/interfaces';
import { calcKsetraBala, calcNavamshaBala, calcUccaBalaValues, calcUdayaBalaValues, calcVakraBala } from './lib/calc-sbc';
import { calcKotaChakraScoreData } from './lib/settings/kota-values';
import { addSnippetKeyToSynastryAspectMatches } from './lib/synastry-aspect-mapper';
const { ObjectId } = Types;

@Injectable()
export class AstrologicService {
  constructor(
    @InjectModel('BodySpeed') private bodySpeedModel: Model<BodySpeed>,
    @InjectModel('Chart') private chartModel: Model<Chart>,
    @InjectModel('PairedChart') private pairedChartModel: Model<PairedChart>,
    private readonly redisService: RedisService,
  ) {}

  async redisClient(): Promise<Redis.Redis> {
    const redisMap = this.redisService.getClients();
    return extractFromRedisMap(redisMap);
  }

  async redisGet(key: string): Promise<any> {
    const client = await this.redisClient();
    return await extractFromRedisClient(client, key);
  }

  async redisSet(key: string, value, expire = -1): Promise<boolean> {
    const client = await this.redisClient();
    return await storeInRedis(client, key, value, expire);
  }

  async createChart(data: CreateChartDTO) {
    let isNew = true;
    const adjustedDate = this.adjustDatetimeByServerTz(data);
    const saveData = { ...data, datetime: adjustedDate };
    if (data.isDefaultBirthChart) {
      const chart = await this.chartModel
        .findOne({
          user: data.user,
          isDefaultBirthChart: true,
        })
        .exec();
      if (chart instanceof Object) {
        const { _id } = chart;
        isNew = false;
        await this.chartModel
          .findByIdAndUpdate(_id, saveData, { new: false })
          .exec();
        return await this.chartModel.findById(_id);
      }
    }
    if (isNew) {
      return this.chartModel.create(saveData);
    }
  }

  async getCoreAdjustedValues(
    ayanamshaKey = 'true_citra',
    start = 0,
    limit = 100,
  ) {
    const steps = unwoundChartFields(ayanamshaKey, start, limit);
    return await this.chartModel.aggregate(steps);
  }

  async getPairedChartSteps(ids: Array<string> = [], max = 1000) {
    const lookupSteps = buildPairedChartLookupPath();
    const projectionStep = buildPairedChartProjection();
    const steps = [
      ...lookupSteps,
      {
        $project: projectionStep,
      },
    ];
    steps.push({
      $match: {
        _id: {
          $in: ids,
        },
      },
    });
    steps.push({ $limit: max });
    return steps;
  }

  async getPairedCharts(
    start = 0,
    max = 1000,
    fieldFilters: Array<string> = [],
    criteria = null,
    countMode = false,
  ) {
    const hasCriteria =
      criteria instanceof Object && Object.keys(criteria).length > 0;
    const lookupSteps = buildPairedChartLookupPath();
    const addSteps = yearSpanAddFieldSteps();
    const steps = [...lookupSteps, ...addSteps];
    if (!countMode) {
      steps.push({
        $project: buildPairedChartProjection(fieldFilters, true),
      });
    }
    if (hasCriteria) {
      const cm: Map<string, any> = new Map();
      let qualityTags = [];
      const extraTags = [];
      let tagsOp = 'or';
      Object.entries(criteria).forEach(entry => {
        const [k, v] = entry;
        if (typeof v === 'string') {
          switch (k) {
            case 'tags':
              qualityTags = v.split(',');
              break;
            case 'gt':
            case 'lt':
            case 'gte':
            case 'lte':
              const refKey = ['$', k].join('');
              cm.set('yearLength', { [refKey]: smartCastInt(v, 0) });
              break;
            case 'relType':
            case 'type':
              cm.set('relType', v);
              break;
            case 'status':
              cm.set('status', v);
              break;
            case 'tagsOp':
              tagsOp = v;
              break;
            case 'endWho':
            case 'endHow':
              extraTags.push(v);
              break;
            case 'rating':
              const roddenItem = matchRoddenKeyValue(v);
              const roddenCompare = {
                [roddenItem.comparison]: roddenItem.value,
              };
              cm.set('$and', [
                {
                  'c1.subject.roddenValue': roddenCompare,
                },
                {
                  'c2.subject.roddenValue': roddenCompare,
                },
              ]);
              break;
            case 'search':
              const pattern = new RegExp(
                '\\b' + generateNameSearchRegex(v),
                'i',
              );
              cm.set('$or', [
                { 'c1.subject.name': { $regex: pattern } },
                {
                  'c2.subject.name': { $regex: pattern },
                },
              ]);
              break;
          }
        }
      });
      if (qualityTags.length > 0 || extraTags.length > 0) {
        const tagsMap: Map<string, any> = new Map();
        const allTags =
          tagsOp === 'and' ? [...qualityTags, ...extraTags] : extraTags;
        const inTags = tagsOp !== 'and' ? qualityTags : [];
        if (inTags.length > 0) {
          tagsMap.set('$in', inTags);
        }
        if (allTags.length > 0) {
          tagsMap.set('$all', allTags);
        }
        cm.set('tags.slug', Object.fromEntries(tagsMap.entries()));
      }
      steps.push({
        $match: Object.fromEntries(cm.entries()),
      });
    }
    if (countMode) {
      steps.push({ $count: 'total' });
    }
    steps.push({ $skip: start });
    steps.push({ $limit: max });
    return await this.pairedChartModel.aggregate(steps);
  }

  async matchPairedIdsByChartId(chartID: string, fetchNames = false) {
    const ids = await this.pairedChartModel
      .find({
        $or: [{ c1: chartID }, { c2: chartID }],
      })
      .select({ _id: 1, c1: 1, c2: 1, relType: 1 });

    const cID = chartID.toString();
    const rows = ids.map(row => {
      const refNum =
        row.c1.toString() === cID ? 1 : row.c2.toString() === cID ? 2 : 0;
      const chartId = refNum === 2 ? row.c1.toString() : row.c2.toString();
      return { id: row._id, chartId, refNum, relType: row.relType };
    });
    if (fetchNames) {
      const items = [];
      const defaultRow = {
        datetime: '',
        tzOffset: 0,
        subject: { name: '', gender: '' },
      };
      for (const row of rows) {
        const cRow = await this.chartModel
          .findById(row.chartId)
          .select('-_id datetime tzOffset subject.name subject.gender');
        const info = cRow instanceof Object ? cRow.toObject() : defaultRow;
        const { datetime, tzOffset, subject } = info;
        const { name, gender } = subject;

        if (notEmptyString(name)) {
          items.push({ ...row, name, gender, datetime, tzOffset });
        }
      }
      return items;
    } else {
      return rows;
    }
  }

  async numPairedCharts(criteria = null, max = 1) {
    const rows = await this.getPairedCharts(0, max, [], criteria, true);
    if (rows instanceof Array && rows.length > 0) {
      const first = rows.shift();
      if (first instanceof Object) {
        return first.total;
      }
    }
    return 0;
  }

  async getCorePairedFields(start = 0, limit = 1000) {
    const steps = [
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c1',
          foreignField: '_id',
          as: 'c1',
        },
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c2',
          foreignField: '_id',
          as: 'c2',
        },
      },
      { $unwind: '$c1' },
      { $unwind: '$c2' },
      {
        $project: {
          c1: '$c1._id',
          p1: '$c2.subject.name',
          p1Dob: '$c1.datetime',
          p1Lat: '$c1.geo.lat',
          p1Lng: '$c1.geo.lng',
          c2: '$c2._id',
          p2: '$c1.subject.name',
          p2Dob: '$c2.datetime',
          p2Lat: '$c2.geo.lat',
          p2Lng: '$c2.geo.lng',
          relType: 1,
          tags: '$tags.slug',
        },
      },
    ];
    return this.pairedChartModel.aggregate(steps);
  }

  async getPairedByIds(ids: Array<string> = [], max = 1000) {
    const lookupSteps = buildPairedChartLookupPath();
    const projectionStep = buildPairedChartProjection();
    const steps = [
      ...lookupSteps,
      {
        $project: projectionStep,
      },
    ];
    steps.push({
      $match: {
        _id: {
          $in: ids,
        },
      },
    });
    steps.push({ $limit: max });
    return await this.pairedChartModel.aggregate(steps);
  }

  async getPairedRandom() {
    const count = await this.pairedChartModel.count({});
    const skip = Math.floor(Math.random() * count * 0.999999);
    const lookupSteps = buildPairedChartLookupPath();
    const projectionStep = buildPairedChartProjection();
    const steps = [
      { $skip: skip },
      { $limit: 1 },
      ...lookupSteps,
      {
        $project: projectionStep,
      },
    ];

    const items = await this.pairedChartModel.aggregate(steps);
    return items.length > 0 ? items[0] : null;
  }


  async progressAspectsFromJds(jd1 = 0, jd2 = 0) {
    const items = await calcProgressAspectsFromJds(jd1, jd2);
    return progressItemsToDataSet(items);
  }

  /* 
    c1: chart 1 id in dual mode, paired chart id in single mode
    c2: chart 1 id in dual mode, 'single' flag in single mode
    NB: related charts will not deleted in single mode
  */
  async removePairedAndCharts(c1: string, c2: string, removeCharts = false) {
    const data = { paired: null, chart1: null, chart2: null };
    const singleDeleteMode = c2 === 'single';
    const filter: Map<string, string> = new Map();
    if (singleDeleteMode) {
      filter.set('_id', c1);
    } else {
      filter.set('c1', c1);
      filter.set('c2', c2);
    }
    const criteria = Object.fromEntries(filter.entries());
    data.paired = await this.pairedChartModel.findOneAndDelete(criteria);
    if (removeCharts && !singleDeleteMode) {
      const pairedRefs1 = await this.matchPairedIdsByChartId(c1);
      if (pairedRefs1.length < 1) {
        data.chart1 = await this.deleteChart(c1);
      }
      const pairedRefs2 = await this.matchPairedIdsByChartId(c2);
      if (pairedRefs2.length < 1) {
        data.chart2 = await this.deleteChart(c2);
      }
    }
    return data;
  }

  async findPairings(c1: string, c2: string) {
    const pairing1 = await this.pairedChartModel.aggregate([
      {
        $lookup: {
          from: 'charts',
          localField: 'c1',
          foreignField: '_id',
          as: 'chart1',
        },
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c2',
          foreignField: '_id',
          as: 'chart2',
        },
      },
      {
        $match: {
          $or: [
            {
              c1,
            },
            {
              c1: c2,
            },
          ],
          'chart1.isDefaultBirthChart': false,
        },
      },
      {
        $project: {
          c1: 1,
          c2: 1,
        },
      },
    ]);
    const pairing2 = await this.pairedChartModel.aggregate([
      {
        $lookup: {
          from: 'charts',
          localField: 'c1',
          foreignField: '_id',
          as: 'chart1',
        },
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c2',
          foreignField: '_id',
          as: 'chart2',
        },
      },
      {
        $match: {
          $or: [
            {
              c2,
            },
            {
              c2: c1,
            },
          ],
          'chart1.isDefaultBirthChart': false,
          'chart2.isDefaultBirthChart': false,
        },
      },
      {
        $project: {
          c1: 1,
          c2: 1,
        },
      },
    ]);

    const pairEqual = row =>
      (row.c1.toString() === c1.toString() &&
        row.c2.toString() === c2.toString()) ||
      (row.c1.toString() === c2.toString() &&
        row.c2.toString() === c1.toString());

    const pc1 = pairing1.filter(row => !pairEqual(row)).length;
    const pc2 = pairing2.filter(row => !pairEqual(row)).length;
    return { pc1, pc2 };
  }

  async migrateRodden(start = 0, limit = 1000) {
    const mp: Map<string, any> = new Map();
    const items = await this.list(mp, start, limit, true);
    const editedIds = [];
    for (const item of items) {
      const { _id, subject } = item;
      if (subject instanceof Object) {
        const { roddenScale, roddenValue } = subject;
        if (typeof roddenValue !== 'number' || roddenValue < 50) {
          const rKey = notEmptyString(roddenScale) ? roddenScale : 'XX';
          const rv = roddenScaleValues.find(ri => ri.key === rKey);
          if (rv instanceof Object) {
            const { value } = rv;
            const newSubject = { ...subject, roddenValue: value };
            await this.chartModel
              .findByIdAndUpdate(_id.toString(), {
                subject: newSubject,
              })
              .exec();
            editedIds.push(_id.toString());
          }
        }
      }
    }
    return editedIds;
  }

  async filterPairedByAspect(
    aspectKey: string,
    k1: string,
    k2: string,
    orb = 1,
    max = 0,
  ) {
    const { steps, outFieldProject, conditions } = addOrbRangeMatchStep(
      aspectKey,
      k1,
      k2,
      orb,
    );
    const projectionStep = {
      $project: outFieldProject,
    };
    const comboSteps = [...steps, projectionStep, ...conditions];
    if (max > 0) {
      comboSteps.push({ $limit: max });
    }
    //const c = conditions.find(cond => Object.keys(cond).includes('$match'));
    return await this.pairedChartModel.aggregate(comboSteps);
  }

  async filterPairedByKutas(
    settingsMap: Map<string, any>,
    kutaKey: string,
    k1: string,
    k2: string,
    range = [0, 0],
  ) {
    const matchMax = (refKey: string) => {
      const row = settingsMap.get(refKey);
      let maxInt = 5;
      if (row instanceof Object) {
        const { max } = row;
        if (isNumber(max)) {
          maxInt = max;
        }
      }
      return maxInt;
    };
    const max = matchMax(kutaKey);
    const percRange =
      range instanceof Array && range.length > 1 ? range : [0, 0];
    const kutaRange = percRange.map(n => (n / 100) * max);
    const steps = this.buildKutaSteps(k1, k2, kutaKey, kutaRange);
    const items = await this.pairedChartModel.aggregate(steps);
    return { items, range, max };
  }

  buildKutaSteps(k1: string, k2: string, kutaKey = '', range = [0, 5]) {
    const [min, max] =
      range instanceof Array && range.length > 1 ? range : [0, 5];
    return [
      {
        $addFields: {
          row: {
            $filter: {
              input: '$kutas',
              as: 'krow',
              cond: {
                $and: [{ $eq: ['$$krow.k1', k1] }, { $eq: ['$$krow.k2', k2] }],
              },
            },
          },
        },
      },
      {
        $unwind: '$row',
      },
      {
        $addFields: {
          kv: {
            $filter: {
              input: '$row.values',
              as: 'vrow',
              cond: { $eq: ['$$vrow.key', kutaKey] },
            },
          },
        },
      },
      {
        $unwind: '$kv',
      },
      {
        $project: {
          key: '$kv.key',
          value: '$kv.value',
        },
      },
      {
        $match: {
          value: { $gte: min, $lte: max },
        },
      },
      {
        $limit: 1000000,
      },
    ];
  }

  async filterPairedByAspectSets(
    aspectSets: Array<AspectSet>,
    start = 0,
    limit = 0,
  ) {
    const projSteps = [];
    const condSteps = [];
    const outFieldProjections = [];
    for (let i = 0; i < aspectSets.length; i++) {
      const { key, k1, k2, orb } = aspectSets[i];
      const { steps, outFieldProject, conditions } = addOrbRangeMatchStep(
        key,
        k1,
        k2,
        orb,
        i,
      );
      steps.forEach(step => {
        projSteps.push(step);
      });
      conditions.forEach(step => {
        condSteps.push(step);
      });
      outFieldProjections.push(outFieldProject);
    }
    let outFieldCombo: any = {};
    for (const outFields of outFieldProjections) {
      outFieldCombo = { ...outFieldCombo, ...outFields };
    }
    const outFieldsProjectStep = {
      $project: outFieldCombo,
    };
    const condStep = {
      $match: {
        $and: condSteps.map(cs => cs.$match),
      },
    };
    const comboSteps = [...projSteps, outFieldsProjectStep, condStep];
    if (start > 0) {
      comboSteps.push({ $skip: start });
    }
    if (limit > 0) {
      comboSteps.push({ $limit: limit });
    }
    return await this.pairedChartModel.aggregate(comboSteps);
  }

  async getGrahaPositions(
    dt = '',
    geo = null,
    addLagna = false,
    ayanamsha = 'true_citra',
  ) {
    const dateParts = dt
      .split('.')
      .shift()
      .split(':');
    const geoKeys = geo instanceof Object ? Object.keys(geo) : [];
    const hasGeo = geoKeys.includes('lat') && geoKeys.includes('lng');
    const geoPos = hasGeo ? geo : { lat: 25, lng: 75, alt: 20 };
    let datetime = '';
    if (dateParts.length === 3) {
      dateParts.pop();
      const minutes = Math.floor(parseInt(dateParts[1]) / 5) * 5;
      const dateKey =
        dateParts[0]
          .split('-')
          .join('')
          .split('T')
          .join('_') + zero2Pad(minutes);
      const { lat, lng } = geoPos;
      const geoKey = [lat, lng].map(v => Math.round(v * 100) / 100).join('_');
      const lagnaKey = addLagna ? 'asc' : 'core';
      const ayanamshaKey = notEmptyString(ayanamsha) ? ayanamsha : 'true_citra';
      const key = [
        'grahapositions_',
        dateKey,
        geoKey,
        lagnaKey,
        ayanamshaKey,
      ].join('_');
      datetime = [dateParts[0], zero2Pad(minutes), '00'].join(':');
      const stored = await this.redisGet(key);
      if (stored instanceof Object) {
        const { bodies, ayanamsha } = stored;
        if (bodies instanceof Array) {
          return {
            items: bodies,
            key,
            geo: geoPos,
            ayanamsha,
            datetime,
            valid: true,
            cached: true,
          };
        }
      } else {
        const data = await calcCoreGrahaPositions(
          dt,
          geoPos,
          ayanamshaKey,
          addLagna,
        );
        if (data instanceof Object) {
          const { bodies, ayanamsha } = data;
          if (bodies instanceof Array) {
            this.redisSet(key, data);
            return {
              items: bodies,
              key,
              geo: geoPos,
              ayanamsha,
              datetime,
              valid: true,
              cached: false,
            };
          }
        }
      }
    }
    return { items: [], key: '', geo, valid: false, cached: false };
  }

  async findAspectMatch(
    k1: string,
    k2: string,
    sourceGrahaLng: number,
    aspect: string,
    orb = -1,
    ayanamshaKey = 'true_citra',
    mode = 'rows',
  ) {
    const ranges = buildLngRanges(aspect, k1, k2, sourceGrahaLng, orb);
    const $project =
      mode !== 'count'
        ? { cid: '$_id', uid: '$user', lng: 1, ayanamsha: '$ayanamshas.value' }
        : { _id: 1 };
    const steps = [
      { $limit: 10000000 },
      { $unwind: '$ayanamshas' },
      { $match: { 'ayanamshas.key': ayanamshaKey } },
      { $unwind: '$grahas' },
      { $match: { 'grahas.key': k2 } },
      {
        $addFields: {
          lng: {
            $mod: [
              {
                $add: [
                  '$grahas.lng',
                  360,
                  { $subtract: [0, '$ayanamshas.value'] },
                ],
              },
              360,
            ],
          },
        },
      },
      { $match: { $or: ranges } },
      { $project },
    ];
    return this.chartModel.aggregate(steps);
  }

  async countByAspectMatch(
    k1: string,
    k2: string,
    sourceGrahaLng: number,
    aspect: string,
    orb = -1,
    ayanamshaKey = 'true_citra',
  ) {
    return await this.findAspectMatch(
      k1,
      k2,
      sourceGrahaLng,
      aspect,
      orb,
      ayanamshaKey,
      'rows',
    );
  }

  async findPredictiveRangeMatch(
    key: string,
    lngs: number[],
    orb = 0,
    ayanamshaKey = 'true_citra',
    mode = 'rows',
  ) {
    const ranges = lngs.map(lng => buildLngRange(lng, orb));
    const $project =
      mode !== 'count'
        ? { cid: '$_id', uid: '$user', lng: 1, ayanamsha: '$ayanamshas.value' }
        : { _id: 1 };
    const steps = [
      { $limit: 10000000 },
      { $unwind: '$ayanamshas' },
      { $match: { 'ayanamshas.key': ayanamshaKey } },
      { $unwind: '$grahas' },
      { $match: { 'grahas.key': key } },
      {
        $addFields: {
          lng: {
            $mod: [
              {
                $add: [
                  '$grahas.lng',
                  360,
                  { $subtract: [0, '$ayanamshas.value'] },
                ],
              },
              360,
            ],
          },
        },
      },
      { $match: { $or: ranges } },
      { $project },
    ];
    return this.chartModel.aggregate(steps);
  }

  async matchAscendantsbyDate(
    dateStr: string,
    lngs: number[],
    orb = 1,
    ayanamshaKey = 'true_citra',
    max = 100,
    mode = 'rows',
  ) {
    const $project =
      mode !== 'count'
        ? {
            cid: '$_id',
            'geo.lat': 1,
            'geo.lng': 1,
            ascendant: 1,
            uid: '$user',
            lng: 1,
            ayanamsha: '$ayanamshas.value',
          }
        : { _id: 1 };
    const steps = [
      { $limit: max },
      { $unwind: '$ayanamshas' },
      { $match: { 'ayanamshas.key': ayanamshaKey } },
      { $project },
    ];
    const jd = calcJulDate(dateStr);
    const matchedAyanamsha = await calcAyanamsha(jd, ayanamshaKey);
    const items = await this.chartModel.aggregate(steps);
    const ranges = lngs.map(lng => buildDegreeRange(lng, orb));
    return items
      .map(item => {
        const { lat, lng } = item.geo;
        const matchedTropicalAscendant = calcTropicalAscendantDt(
          lat,
          lng,
          dateStr,
        );
        const ascendantLng = subtractLng360(item.ascendant, item.ayanamsha);
        const matchedAscendant = subtractLng360(
          matchedTropicalAscendant,
          matchedAyanamsha,
        );
        const aspect = subtractLng360(ascendantLng, matchedAscendant);
        return {
          ...item,
          ascendantLng,
          matchedTropicalAscendant,
          matchedAscendant,
          aspect,
        };
      })
      .filter(item =>
        ranges.some(range => inRange(item.matchedAscendant, range)),
      );
  }

  adjustDatetimeByServerTz(data: any = null) {
    const tzMins = new Date().getTimezoneOffset();
    if (tzMins !== 0 && data instanceof Object) {
      /* const adjustedDate = moment
        .utc(data.datetime)
        .subtract(tzMins, 'minutes')
        .toISOString()
        .replace(/:\.\w+$/, ':00Z'); */
      const adjustedDate = moment
        .utc(data.datetime)
        .toISOString()
        .replace(/\.\w+$/, '.00Z');

      data = { ...data, datetime: new Date(adjustedDate) };
    }
    return data.datetime;
  }

  assignBaseChart(data: any) {
    const mp = new Map<string, any>();
    if (data instanceof Object) {
      Object.entries(data).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'datetime':
          case 'jd':
          case 'geo':
          case 'tz':
          case 'tzOffset':
          case 'ascendant':
          case 'mc':
          case 'vertex':
          case 'grahas':
          case 'houses':
          case 'indianTime':
          case 'ayanamshas':
          case 'upagrahas':
          case 'sphutas':
          case 'numValues':
          case 'objects':
            mp.set(key, value);
            break;
        }
      });
    }
    return Object.fromEntries(mp);
  }

  // update existing with unique chartID
  async updateChart(chartID: string, data: CreateChartDTO) {
    const chart = await this.chartModel.findById(chartID);
    if (chart instanceof Object) {
      const adjustedDate = this.adjustDatetimeByServerTz(data);

      await this.chartModel
        .findByIdAndUpdate(
          chartID,
          { ...data, datetime: adjustedDate, modifiedAt: new Date() },
          { new: false },
        )
        .exec();
      return await this.chartModel.findById(chartID);
    }
  }

  // update existing with unique chartID
  async updateProgressItems(
    chartID: string,
    progressItems: ProgressItemDTO[] = [],
  ) {
    return await this.chartModel
      .findByIdAndUpdate(
        chartID,
        { progressItems, modifiedAt: new Date() },
        { new: false },
      )
      .exec();
  }

  async idsWithoutProgressItems(limit = 100) {
    const idRows = await this.chartModel
      .find({
        $or: [
          { progressItems: { $exists: false } },
          { progressItems: { $size: 0 } }
        ]
      })
      .select('_id')
      .limit(limit);
    return idRows instanceof Array ? idRows.map(row => row._id.toString()) : [];
  }

  /*
   * maintenance
   */
  async saveP2Set(chartID = '') {
    let numUpdated = 0;
    let numProgressItems = 0;
    let matched = false;
    if (notEmptyString(chartID) && isValidObjectId(chartID)) {
      const chartData = await this.getChart(chartID);
      const currentJd = currentJulianDay();
      const oneYearOld = currentJd - 365.25;
      const lastFutureJd = currentJd + 365.25 / 2;
      if (chartData instanceof Model) {
        matched = true;
        const chartObj = chartData.toObject();
        const cKeys = Object.keys(chartObj);
        const pItems =
          cKeys.includes('progressItems') &&
          chartData.progressItems instanceof Array
            ? chartData.progressItems.filter(pi => pi.jd >= oneYearOld)
            : [];
        numProgressItems = pItems.length;
        const newProgressSet = await buildSingleProgressSetKeyValues(
          chartObj.jd,
          2
        );
        let lastItemJd = 0;
        if (pItems.length > 6) {
          pItems.sort((a, b) => a.jd - b.jd);
          lastItemJd = pItems[pItems.length - 1].jd;
        }
        if (lastItemJd < lastFutureJd) {
          const newProgressItems = newProgressSet.filter(
            pi => pi.jd > lastItemJd,
          );
          const progressItems = pItems.map(pi => pi as ProgressItemDTO);
          for (const pItem of newProgressItems) {
            progressItems.push(pItem as ProgressItemDTO);
          }
          const updated = await this.updateProgressItems(
            chartID,
            progressItems,
          );
          if (updated instanceof Model) {
            numUpdated = newProgressItems.length;
            numProgressItems = progressItems.length;
          }
        }
      }
    }
    return { numUpdated, numProgressItems, matched };
  }

  // get chart by ID
  async getChart(chartID: string): Promise<Chart> {
    let chart = null;
    await this.chartModel
      .findById(chartID)
      .then(c => (chart = c))
      .catch(console.log);
    return chart;
  }

  async getCurrentChartObj(dtUtc = '', geo: GeoPos, tzOffset = -1, ayanamsaKey = 'true_citra'): Promise<ChartClass> {
    const approxLat = Math.round(geo.lat / 15) * 15;
    const approxLng = Math.round(geo.lng / 15) * 15;
    const geoOffset = tzOffset !== -1 ? tzOffset : approxLng * 240; // solar timezone offset to nearest hour in secs
    const approxTimeDt = dtStringToNearest15Minutes(dtUtc);
    const key = ['curr-bc', approxTimeDt, approxLat, approxLng].join('-');
    const stored = await this.redisGet(key);
    let tData = null;
    if (stored instanceof Object) {
      tData = stored;
    } else {
      tData = await calcCompactChartData(
        dtUtc,
        geo,
        'top',
        [ayanamsaKey],
        geoOffset,
        false,
        false,
      );
      this.redisSet(key, tData, 30 * 60);
    }
    return new ChartClass(tData);
  }

  async getChartIDByUserRef(refKey: string, type = 'id'): Promise<string> {
    
    let useAggregation = false;
    const filter: Map<string, any> = new Map();
    filter.set('isDefaultBirthChart', true);
    switch (type) {
      case 'email':
        filter.set('u.identifier', new RegExp('^' + refKey, 'i'));
        useAggregation = true;
        break;
      default:
        filter.set('user', refKey);
        break;
    }

    filter.set('isDefaultBirthChart', true);
    const criteria = Object.fromEntries(filter);
    
    let rows: any[] = [];
    if (useAggregation) {
      const lookupSteps = buildChartLookupPath('u');
      const steps = [
        ...lookupSteps,
        {
          $match: criteria,
        },
        {
          $project: {
            _id: '$_id',
          },
        }
      ];
      rows = await this.chartModel.aggregate(steps);
    } else {
      rows = await this.chartModel.find(criteria).select('_id');
    }
    if (rows.length > 0) {
      return rows[0]._id.toString();
    }
    return '';
  }

  async getChartIDByEmail(email: string): Promise<string> {
    return await this.getChartIDByUserRef(email, 'email');
  }

  async getChartIDByUser(userID: string): Promise<string> {
    return await this.getChartIDByUserRef(userID, 'id');
  }

  // get chart by ID
  async getChartsByIds(ids: string[]): Promise<Chart[]> {
    return await this.chartModel.find({ _id: { $in: ids } });
  }

  async matchExistingPlaceNames(geo: GeoLoc, km = 3, withinKm = 1) {
    const latSize = km / 111;
    const calcLngScale = lng => Math.cos(Math.abs(lng) * (Math.PI / 180));
    //const lngNeg = geo.lng < 0? -1 : 1;
    const lngSize = (1 / (calcLngScale(geo.lng) * 111)) * km;

    const latRange = { $gte: geo.lat - latSize, $lte: geo.lat + latSize };
    const lngRange = { $gte: geo.lng - lngSize, $lte: geo.lng + lngSize };
    const steps = [
      {
        $match: {
          'placenames.geo.lat': { $exists: true },
          $or: [
            {
              'placenames.geo.lat': latRange,
              'placenames.geo.lng': lngRange,
            },
            {
              'geo.lat': latRange,
              'geo.lng': lngRange,
            },
          ],
        },
      },
      {
        $project: {
          tz: 1,
          tzOffset: 1,
          'geo.lat': 1,
          'geo.lng': 1,
          'placenames.name': 1,
          'placenames.fullName': 1,
          'placenames.geo.lat': 1,
          'placenames.geo.lng': 1,
          'placenames.geo.alt': 1,
          modifiedAt: 1,
        },
      },
      {
        $sort: {
          modifiedAt: -1,
        },
      },
      {
        $limit: 10,
      },
    ];
    const records = await this.chartModel.aggregate(steps);
    const items = [];
    const keys: string[] = [];
    const latLng = geo.latLng;
    records.forEach(rec => {
      const { placenames, tz, tzOffset } = rec;
      const chartGeo = rec.geo;
      const lastIndex =
        placenames instanceof Array ? placenames.length - 1 : -1;
      if (lastIndex >= 0) {
        const nearest = placenames[lastIndex];
        const key = [
          sanitize(nearest.fullName),
          nearest.geo.lat,
          nearest.geo.lng,
        ].join('__');
        if (!keys.includes(key)) {
          keys.push(key);
          const distance = calcCoordsDistance(latLng, chartGeo, 'km');
          items.push({ placenames, distance, tz, tzOffset });
        }
      }
    });
    items.sort((a, b) => a.distance - b.distance);
    return items.filter(r => r.distance <= withinKm);
  }

  async bulkUpdatePaired(start = 0, limit = 100, kutaSet = null, idStr = '') {
    const filter: any = notEmptyString(idStr, 16) ? { _id: idStr } : {};
    const records = await this.pairedChartModel
      .find(filter)
      .skip(start)
      .limit(limit);
    let updated = 0;
    const ids: Array<string> = [];
    for (const record of records) {
      const { aspects, kutas } = await this.saveExtraValues(
        record.c1,
        record.c2,
        kutaSet,
      );
      if (aspects.length > 0) {
        await this.pairedChartModel.findByIdAndUpdate(
          record._id,
          { aspects, kutas },
          {
            new: false,
          },
        );
        ids.push(record._id);
        updated++;
      }
    }
    return {
      start,
      limit,
      updated,
      ids,
    };
  }

  async savePaired(pairedDTO: PairedChartDTO, setting = null, isNew = false) {
    const { c1, c2 } = pairedDTO;
    const numCharts = await this.chartModel
      .count({ _id: { $in: [c1, c2] } })
      .exec();
    let result: any = { valid: false };

    const nowDt = new Date();
    const { aspects, kutas } = await this.saveExtraValues(c1, c2, setting);
    pairedDTO = { ...pairedDTO, aspects, kutas, modifiedAt: nowDt };
    if (numCharts === 2) {
      const currPairedChart = await this.pairedChartModel
        .findOne({
          c1,
          c2,
        })
        .exec();
      if (currPairedChart && !isNew) {
        const { _id } = currPairedChart;
        result = await this.pairedChartModel.findByIdAndUpdate(_id, pairedDTO);
      } else {
        pairedDTO = { ...pairedDTO, createdAt: nowDt };
        const pairedChart = await this.pairedChartModel.create(pairedDTO);
        result = await pairedChart.save();
      }
      if (result) {
        result = await this.pairedChartModel
          .findById(result._id)
          .populate(['c1', 'c2']);
      }
    }
    return result;
  }

  async updatePairedChartIds(pairedID = '', chartID = '', refNum = 0) {
    const params = refNum === 1 ? { c1: chartID } : { c2: chartID };
    return await this.pairedChartModel.findById(pairedID, params);
  }

  async saveExtraValues(c1: string, c2: string, kutaSet = null) {
    let kutas = [];
    let aspects = [];
    if (kutaSet instanceof Map) {
      const c1C = await this.chartModel.findById(c1);
      const c2C = await this.chartModel.findById(c2);
      if (c1C instanceof Object && c2C instanceof Object) {
        const chart1 = new ChartClass(c1C.toObject());
        const chart2 = new ChartClass(c2C.toObject());
        chart1.setAyanamshaItemByNum(27);
        chart2.setAyanamshaItemByNum(27);
        const kutaBuilder = new Kuta(chart1, chart2);
        kutaBuilder.loadCompatibility(kutaSet);
        kutas = kutaBuilder.calcAllSingleKutas();
        aspects = calcAllAspects(chart1, chart2);
      }
    }
    return { aspects, kutas };
  }

  async getPairedByUser(userID: string, limit = 0, params = null) {
    const max = limit > 0 && limit < 1000 ? limit : 1000;
    const criteria: Map<string, any> = new Map();
    if (notEmptyString(userID, 16)) {
      criteria.set('user', userID);
    }
    if (params instanceof Object) {
      Object.entries(params).forEach(entry => {
        const [key, val] = entry;
        switch (key) {
          case 'type':
            criteria.set('relType', val);
            break;
          case 'tag':
            criteria.set('tags.slug', val);
            break;
          case 'length_gt':
            criteria.set('span', {
              $gt: val,
            });
            break;
          case 'length_lt':
            criteria.set('span', {
              $lt: val,
            });
          case 'ids':
            criteria.set('_id', {
              $in: val,
            });
            break;
        }
      });
    }

    const items = await this.pairedChartModel
      .find(Object.fromEntries(criteria))
      .limit(max)
      .populate(['c1', 'c2'])
      .sort([['modifiedAt', -1]])
      .populate(['c1', 'c2'])
      .exec();
    return items.map(mapPairedCharts);
  }

  async getPairedByChart(
    chartID: string,
    sort = 'modifiedAt',
    limit = 0,
    chartID2 = ''
  ) {
    const max = limit > 0 && limit < 1000 ? limit : 1000;
    let sortDir = -1;
    switch (sort) {
      case 'subject.name':
        sortDir = 1;
        break;
    }
    const hasMatchC2 = notEmptyString(chartID2, 8);
    const cond1 = hasMatchC2 ? { c1: chartID, c2: chartID2 } : { c1: chartID };
    const cond2 = hasMatchC2 ? { c2: chartID, c1: chartID2 } : { c2: chartID };
    const items = await this.pairedChartModel
      .find({
        $or: [cond1, cond2],
      })
      .limit(max)
      .sort([[sort, sortDir]])
      .populate(['c1', 'c2'])
      .exec();
    return items.map(mapPairedCharts);
  }

  async getPairedBySearchString(
    userID: string,
    search = '',
    isAdmin = false,
    limit = 20,
  ) {
    const max = limit > 0 && limit < 1000 ? limit : 1000;
    const rgx = new RegExp('\\b' + search, 'i');
    const criteria: Map<string, any> = new Map();

    if (!isAdmin) {
      criteria.set('user', userID);
    }
    criteria.set('$or', [
      {
        'chart1.subject.name': rgx,
      },
      {
        'chart2.subject.name': rgx,
      },
    ]);

    const chartFields = {
      _id: 1,
      datetime: 1,
      jd: 1,
      geo: {
        lng: 1,
        lat: 1,
      },
      placenames: {
        type: 1,
        name: 1,
      },
      subject: {
        name: 1,
        gender: 1,
      },
    };

    const items = await this.pairedChartModel
      .aggregate([
        {
          $lookup: {
            from: 'charts',
            localField: 'c1',
            foreignField: '_id',
            as: 'chart1',
          },
        },
        {
          $lookup: {
            from: 'charts',
            localField: 'c2',
            foreignField: '_id',
            as: 'chart2',
          },
        },
        {
          $match: Object.fromEntries(criteria),
        },
        {
          $project: {
            _id: 1,
            jd: 1,
            relType: 1,
            timespace: {
              jd: 1,
              tzOffset: 1,
            },
            surfaceTzOffset: 1,
            chart1: chartFields,
            chart2: chartFields,
            modifiedAt: 1,
          },
        },
      ])
      .limit(max)
      .exec();
    return items.map(item => {
      const { _id, timespace, relType, chart1, chart2, modifiedAt } = item;
      const c1 = mapSubChartMeta(chart1);
      const c2 = mapSubChartMeta(chart2);
      const jd = (c1.jd + c2.jd) / 2;
      const offset =
        typeof timespace.surfaceTzOffset === 'number'
          ? timespace.surfaceTzOffset
          : 0;
      const year = julToISODateObj(jd, offset).year();
      return {
        _id,
        jd,
        year,
        relType,
        timespace,
        c1,
        c2,
        modifiedAt,
      };
    });
  }

  async getPairedByChartIDs(c1: string, c2: string) {
    const charts = await this.getPairedByChart(c1, 'modifiedAt', 1, c2);
    if (charts.length > 0) {
      return charts[0];
    } else {
      const chart1 = await this.getChart(c1);
      const inData = {
        user: chart1.user,
        c1,
        c2,
      } as PairedChartDTO;
      return await this.savePaired(inData);
    }
  }

  async tagStats(limit = 10000) {
    const pcs = await this.pairedChartModel
      .aggregate([
        {
          $project: {
            _id: 0,
            relType: 1,
            'tags.slug': 1,
            'tags.vocab': 1,
          },
        },
      ])
      .limit(limit)
      .exec();
    const tagTypes: Map<string, KeyValue> = new Map();
    pcs.forEach(pc => {
      const { relType, tags } = pc;
      if (tags instanceof Array) {
        tags.forEach(tg => {
          const slugKey = sanitize(tg.slug, '_');
          if (slugKey.length > 0 && slugKey !== '_') {
            const tagOpt = tagTypes.get(slugKey);
            const value = tagOpt instanceof Object ? tagOpt.value + 1 : 1;
            const key = notEmptyString(tg.vocab, 1) ? tg.vocab : 'trait';
            tagTypes.set(slugKey, {
              key,
              value,
            });
          }
        });
      }
      if (notEmptyString(relType, 2)) {
        const relTypeMatched =
          tags.filter(tg => tg.slug === relType).length > 0;
        if (!relTypeMatched) {
          const relTag = tagTypes.get(relType);
          const value = relTag instanceof Object ? relTag.value + 1 : 1;
          tagTypes.set(relType, {
            key: 'type',
            value,
          });
        }
      }
    });

    const types: Map<string, KeyValue[]> = new Map();
    [...tagTypes.entries()].forEach(entry => {
      const [key, keyVal] = entry;
      const typeSet = types.get(keyVal.key);
      const innerTags = typeSet instanceof Object ? typeSet : [];
      innerTags.push({
        key,
        value: keyVal.value,
      });
      types.set(keyVal.key, innerTags);
    });
    return Object.fromEntries(types);
  }

  

  mapKutaColValues(kutas: KutaValueSetItems[], dictMap: Map<string, string>) {
    const simplifyKey = (key: string) => {
      let parts = key.split('/');
      if (parts.length > 2) {
        parts = parts.slice(0, 2);
      }
      return parts.join('/');
    }
    return kutas.map(row => {
      const values = row.values.map(item => {
        const dk1 = simplifyKey(item.c1Value);
        const titleKey = [item.key,0].join('/');
        if (dictMap.has(titleKey)) {
          item.title = dictMap.get(titleKey);
        }
        if (dictMap.has(dk1)) {
          item.c1Value = dictMap.get(dk1);
        }
        const dk2 = simplifyKey(item.c2Value);
        if (dictMap.has(dk2)) {
          item.c2Value = dictMap.get(dk2);
        }
        const { key, title, c1Value, c2Value, score, max } = item;
        return { key, title, c1Value, c2Value, score, max };
      });
      const score = values.map(v => v.score).reduce((a,b) => a + b, 0);
      const max = values.map(v => v.max).reduce((a,b) => a + b, 0);
      return {...row, values, score, max };
    });
  }

  async getTraits(shortOnly = true, limit = 100000) {
    const pcs = await this.pairedChartModel
      .aggregate([
        {
          $project: {
            _id: 0,
            'tags.slug': 1,
            'tags.name': 1,
            'tags.vocab': 1,
          },
        },
        {
          $match: {
            'tags.vocab': 'trait',
          },
        },
      ])
      .limit(limit)
      .exec();
    const tagOpts: Map<string, KeyValue> = new Map();
    const descriptiveName = (name: string) => {
      return name.length > 36 || (name.length > 20 && /[.,)()_-]/.test(name));
    };
    pcs.forEach(pc => {
      const { tags } = pc;
      if (tags instanceof Array) {
        tags.forEach(tg => {
          const slugKey = sanitize(tg.slug, '_');
          const valid = shortOnly ? !descriptiveName(tg.name) : true;
          if (valid && slugKey.length > 0 && slugKey !== '_') {
            const tagOpt = tagOpts.get(slugKey);
            const exists = tagOpt instanceof Object;
            const value = exists ? tagOpt.value + 1 : 1;
            const key = exists ? tagOpt.key : tg.name;
            tagOpts.set(slugKey, {
              key,
              value,
            });
          }
        });
      }
    });
    return [...tagOpts.entries()].map(entry => {
      const [key, obj] = entry;
      return {
        key,
        name: obj.key,
        value: obj.value,
      };
    });
  }

  async reassignTags(
    source: TagDTO,
    target: TagDTO = null,
    yearSpan = -1,
    addToNotes = false,
    limit = 1000000,
  ) {
    const pcs = await this.pairedChartModel
      .aggregate([
        {
          $project: {
            _id: 1,
            relType: 1,
            span: 1,
            'tags.slug': 1,
            'tags.name': 1,
            'tags.vocab': 1,
            notes: 1,
          },
        },
        {
          $match: {
            'tags.vocab': source.vocab,
            'tags.slug': source.slug,
          },
        },
      ])
      .limit(limit)
      .exec();
    pcs.forEach(pc => {
      this._reassignTagsInPaired(pc, source, target, yearSpan, addToNotes);
    });
    return pcs.map(pc => pc._id);
  }

  _reassignTagsInPaired(
    pc,
    source: TagDTO,
    target: TagDTO,
    yearSpan = -1,
    addToNotes = false,
  ) {
    const { _id, relType, tags, span, notes } = pc;
    const filteredTags = tags.filter(
      tg => !(tg.slug === source.slug && tg.vocab === source.vocab),
    );
    if (notEmptyString(target.name) && notEmptyString(target.vocab, 2)) {
      filteredTags.push(target);
    }
    const updatedFields: Map<string, any> = new Map();
    const newTags = this.dedupeTags(filteredTags);
    updatedFields.set('tags', newTags);
    if (yearSpan > 0 && span <= 0) {
      updatedFields.set('span', yearSpan);
    }
    const firstRelTag = newTags.find(tg => tg.vocab === 'type');
    if (firstRelTag instanceof Object && firstRelTag.slug !== relType) {
      updatedFields.set('relType', firstRelTag.slug);
    }
    if (addToNotes) {
      const noteParts = notEmptyString(notes) ? [notes] : [];
      noteParts.push(source.name);
      updatedFields.set('notes', noteParts.join('.\n'));
    }
    this.pairedChartModel
      .findByIdAndUpdate(_id, Object.fromEntries(updatedFields))
      .exec();
  }

  dedupeTags(tags: TagDTO[] = []) {
    const filteredTags = [];
    const slugIds: string[] = [];
    tags.forEach(tg => {
      const slugId = [tg.slug, tg.vocab].join('__');
      if (slugIds.includes(slugId) === false) {
        filteredTags.push(tg);
      }
    });
    return filteredTags;
  }

  async deletePaired(pairedID: string) {
    await this.pairedChartModel.findByIdAndDelete(pairedID);
    return pairedID;
  }

  async getUserBirthChart(userID = '') {
    return await this.chartModel
      .findOne({ user: userID, isDefaultBirthChart: true })
      .exec();
  }

  async expandUserWithChartData(user: User, flags: UserFlagSet, refChart: ChartClass, customSettings: any = {}, fullChart = false, ayanamshaKey = 'true_citra', simpleMode = 'basic') {
    const chartObj = await this.getUserBirthChart(user._id);
    const hasChart = chartObj instanceof Object;
    const chartSource = hasChart ? chartObj.toObject() : {};
    const chart = new ChartClass(chartSource);
    const chartData = hasChart ? fullChart ? chart : simplifyChart(chartSource, ayanamshaKey, simpleMode) : {};
    const refUserId = user._id.toString();
    // kutaSet: any = null, kcScoreSet: KotaCakraScoreSet, orbMap = null
    const { kutaSet, kcScoreSet, orbMap, p2Scores, dictMap } = customSettings;
    const preferences =
      user.preferences instanceof Array && user.preferences.length > 0
        ? user.preferences.filter(filterCorePreference)
        : [];
    const filteredLikes = {
          from: mapLikeabilityRelations(flags.likeability.from, refUserId),
          to: mapLikeabilityRelations(flags.likeability.to, refUserId),
        };
    const kutaRows: KutaValueSetItems[] = hasChart? this._calcKutas(
      refChart,
      chart,
      kutaSet,
      'ashta',
    ) : [];
    addExtraPanchangaNumValuesFromClass(chartData, chart, 'true_citra');
    const pd = calcProgressAspectDataFromProgressItems(chart.matchProgressItems(), refChart.matchProgressItems());
    const p2Summary = pd.num > 0 ? calcProgressSummary(pd.items, true, p2Scores) : {};
    const kcS1 = calcKotaChakraScoreData(refChart, chart, kcScoreSet, true);
    const kcS2 = calcKotaChakraScoreData(chart, refChart, kcScoreSet, true);
    const baseAspectKeys = ['as','su','mo','me','ve','ma'];
    const ascAspectKeys = [...baseAspectKeys, 'ju','sa', 'ur', 'pl'];
    const aspectMatches = calcAspectMatches(refChart, chart, baseAspectKeys, ascAspectKeys, orbMap);
    const aspects = addSnippetKeyToSynastryAspectMatches(aspectMatches, refChart.shortName, chart.shortName);
    const shortName = user.nickName.split(' ').shift();
    return {
      ...user,
      shortName,
      hasChart,
      chart: chartData,
      preferences,
      kutas: this.mapKutaColValues(kutaRows, dictMap),
      aspects,
      p2: p2Summary,
      kc: { 
        a: kcS1.total,
        b: kcS2.total,
      },
      likeability: filteredLikes,
    };
  }

  compareCharts(refChart: ChartClass, chart: ChartClass, customSettings: any = {}) {
    // kutaSet: any = null, kcScoreSet: KotaCakraScoreSet, orbMap = null
    const { kutaSet, kcScoreSet, orbMap, p2Scores, dictMap } = customSettings;
    
    const kutaRows: KutaValueSetItems[] = this._calcKutas(
      refChart,
      chart,
      kutaSet,
      'ashta',
    );
    const pd = calcProgressAspectDataFromProgressItems(chart.matchProgressItems(), refChart.matchProgressItems());
    const p2Summary = pd.num > 0 ? calcProgressSummary(pd.items, true, p2Scores) : {};
    const kcS1 = calcKotaChakraScoreData(refChart, chart, kcScoreSet, true);
    const kcS2 = calcKotaChakraScoreData(chart, refChart, kcScoreSet, true);
    const baseAspectKeys = ['as','su','mo','me','ve','ma'];
    const ascAspectKeys = [...baseAspectKeys, 'ju','sa', 'ur', 'pl'];
    const aspectMatches = calcAspectMatches(refChart, chart, baseAspectKeys, ascAspectKeys, orbMap);
    const aspects = addSnippetKeyToSynastryAspectMatches(aspectMatches, refChart.shortName, chart.shortName);
    return {
      kutas: this.mapKutaColValues(kutaRows, dictMap),
      aspects,
      p2: p2Summary,
      kc: { 
        a: kcS1.total,
        b: kcS2.total,
      },
    };
  }

  _calcKutas(
    c1: ChartClass,
    c2: ChartClass,
    kutaSet: Map<string, any> = new Map(),
    kutaTypeKey = 'ashta',
  ) {
    c1.setAyanamshaItemByKey('true_citra');
    c2.setAyanamshaItemByKey('true_citra');
    const kutaBuilder = new Kuta(c1, c2);
    kutaBuilder.loadCompatibility(kutaSet);
    const grahaKeys = ['su', 'mo', 've', 'as'];
    return kutaBuilder.calcAllSingleFullKutas(grahaKeys, kutaTypeKey, false);
  }

  async getChartsByUser(
    userID: string,
    start = 0,
    limit = 20,
    defaultOnly = false,
    queryParams = null,
    isAdmin = false,
  ) {
    const condMap = new Map<string, any>();
    let showUserFirst = start < 1;
    if (queryParams instanceof Object) {
      Object.entries(queryParams).map(entry => {
        const [key, val] = entry;
        if (typeof val === 'string') {
          showUserFirst = false;
          switch (key) {
            case 'name':
              condMap.set('subject.name', RegExp(val, 'i'));
              break;
            case 'id':
              condMap.set('_id', val);
              break;
          }
        }
      });
    }
    let first = null;
    if (showUserFirst) {
      first = await this.chartModel
        .findOne({ user: userID, isDefaultBirthChart: true })
        .exec();
    }

    if (!condMap.has('_id') || !isAdmin) {
      condMap.set('user', userID);
    }

    if (defaultOnly) {
      condMap.set('isDefaultBirthChart', true);
    }
    const others = await this.chartModel
      .find(Object.fromEntries(condMap))
      .sort({ modifiedAt: -1 })
      .skip(start)
      .limit(limit)
      .exec();
    const charts: Array<Chart> = [];
    if (first) {
      charts.push(first);
    }
    if (others.length > 0) {
      others.forEach(c => {
        charts.push(c);
      });
    }
    return charts;
  }

  async getCoreChartDataByUser(
    userID: string,
    search = '',
    status = '',
    start = 0,
    limit = 20,
  ) {
    const condMap = new Map<string, any>();
    if (notEmptyString(search)) {
      const nameRgx = RegExp('\\b' + generateNameSearchRegex(search), 'i');
      condMap.set('$or', [
        { 'subject.name': nameRgx },
        { 'subject.altNames': nameRgx },
      ]);
    }
    if (notEmptyString(status, 2) && status !== 'all') {
      condMap.set('status', status);
    }
    condMap.set('user', userID);
    condMap.set('subject.eventType', 'birth');
    return await this.chartModel
      .find(Object.fromEntries(condMap))
      .select({
        _id: 1,
        'subject.name': 1,
        'subject.gender': 1,
        'subject.roddenValue': 1,
        status: 1,
        datetime: 1,
        jd: 1,
        tzOffset: 1,
        'geo.lat': 1,
        'geo.lng': 1,
        'geo.alt': 1,
        isDefaultBirthChart: 1,
      })
      .sort({ 'subject.name': 1 })
      .skip(start)
      .limit(limit);
  }

  /*
   * AstroWebApp
   * Potential use in mobile app
   */
  async getChartNamesByUserAndName(
    userID: string,
    search: string,
    limit = 20,
    longNames = false,
  ) {
    const searchLen = notEmptyString(search) ? search.length : 0;
    const multiplier =
      searchLen < 3 ? 4 : searchLen < 5 ? 3 : searchLen < 7 ? 2 : 1.5;
    const searchLimit = limit * multiplier;
    const charts = await this.getCoreChartDataByUser(
      userID,
      search,
      '',
      0,
      searchLimit,
    );
    const rgx = new RegExp('^' + generateNameSearchRegex(search));
    const fuzzRgx = new RegExp('\\b' + generateNameSearchRegex(search));
    const matchedItems = charts
      .filter(c => c instanceof Object)
      .map((c, ci) => {
        const year = julToISODateObj(c.jd, c.tzOffset).year();
        const names = c.subject.name.split(' ');
        const numNames = names.length;
        const lastNameIndex = numNames - 1;
        const matchesFirst = rgx.test(names[0]);
        const fuzzyMatchesFirst = matchesFirst ? false : fuzzRgx.test(names[0]);
        const matchesLast =
          numNames > 1 ? rgx.test(names[lastNameIndex]) : false;
        const fuzzyMatchesLast = matchesLast
          ? false
          : fuzzRgx.test(names[lastNameIndex]);
        const matchWeight = matchesFirst
          ? searchLimit * 150
          : fuzzyMatchesFirst
          ? searchLimit * 100
          : matchesLast
          ? searchLimit * 175
          : fuzzyMatchesLast
          ? searchLimit * 150
          : 0;
        const indexWeight = (searchLimit - ci) * 99;
        const weight = indexWeight + matchWeight;
        const name = longNames
          ? `${c.subject.name} (${c.subject.gender})`
          : `${shortenName(c.subject.name)} (${c.subject.gender})`;
        return {
          id: c._id,
          name,
          year,
          weight,
        };
      });
    matchedItems.sort((a, b) => b.weight - a.weight);
    const numExtra = matchedItems.length - limit;
    if (numExtra > 0) {
      matchedItems.splice(limit, numExtra);
    }
    // dedupe results
    const items = [];
    const strings: string[] = [];
    matchedItems.forEach(item => {
      const str = sanitize(item.name);
      if (strings.includes(str) === false) {
        strings.push(str);
        items.push(item);
      }
    });
    return items;
  }

  /*
   * AstroWebApp only
   */
  async countCoreChartDataByUser(userID: string, search = '', status = '') {
    const condMap = new Map<string, any>();
    if (notEmptyString(search)) {
      const nameRgx = RegExp('\\b' + generateNameSearchRegex(search), 'i');
      condMap.set('$or', [
        { 'subject.name': nameRgx },
        { 'subject.altNames': nameRgx },
      ]);
    }
    if (notEmptyString(status, 2)) {
      condMap.set('status', status);
    }
    condMap.set('user', userID);
    return await this.chartModel.count(Object.fromEntries(condMap));
  }

  /*
   * Development and maintenace
   * save a single body speed record
   */
  async saveBodySpeed(data: BodySpeedDTO): Promise<BodySpeed> {
    const record = await this.bodySpeedModel
      .findOne({ jd: data.jd, num: data.num })
      .exec();
    if (record instanceof Object) {
      const { _id } = record;
      await this.bodySpeedModel
        .findByIdAndUpdate(_id, data, { new: false })
        .exec();
      return await this.bodySpeedModel.findById(_id);
    } else {
      const newBodySpeed = await this.bodySpeedModel.create(data);
      return newBodySpeed.save();
    }
  }

  async listByUser(userID: string) {
    return await this.chartModel
      .find({ user: userID })
      .sort({ isDefaultBirthChart: -1 })
      .exec();
  }

  /*
   * Core chart listing method
   * used by AstroWebApp
   */
  async list(
    criteria: Map<string, any> = new Map<string, any>(),
    start = 0,
    limit = 100,
    useAggregation = false,
    synopsis = false,
  ) {
    const filter = Object.fromEntries(criteria);
    const sort = { isDefaultBirthChart: -1 };
    if (useAggregation) {
      const steps: any = [
        { $match: filter },
        { $skip: start },
        { $limit: limit },
        { $sort: sort },
      ];
      if (synopsis) {
        steps.push({
          $project: {
            jd: 1,
            user: 1,
            parent: 1,
            isDefaultBirthChart: 1,
            datetime: 1,
            tzOffset: 1,
            tz: 1,
            lat: '$geo.lat',
            alt: '$geo.alt',
            lng: '$geo.lng',
            name: '$subject.name',
            notes: '$subject.notes',
            gender: '$subject.gender',
            type: '$subject.type',
            eventType: '$subject.eventType',
            roddenValue: '$subject.roddenValue',
          },
        });
      }
      return await this.chartModel
        .aggregate(steps)
        .allowDiskUse(true)
        .exec();
    } else {
      return await this.chartModel
        .find(filter)
        .skip(start)
        .limit(limit)
        .sort(sort)
        .exec();
    }
  }

  /*
  Fetch a snapshot of a chart at 0ºN 0ºE as the basis
  for modified charts with geo-sensitive ascendants
  */
  async getChartSnapshot(
    dt = '',
    ayanamshaMode = 'true_citra',
    skipCache = false,
  ) {
    const key = ['chartsnap', dt, ayanamshaMode].join('_');
    const stored = skipCache ? null : this.redisGet(key);
    const hasStored =
      stored instanceof Object && Object.keys(stored).includes('grahas');
    const data = hasStored
      ? stored
      : await this.fixedChartSnapshot(dt, ayanamshaMode);
    if (!hasStored && data instanceof Object) {
      this.redisSet(key, data);
    }
    return data;
  }

  async fixedChartSnapshot(dt = '', ayanamshaMode = 'true_citra') {
    let data: any = { valid: false };
    if (validISODateString(dt)) {
      const geo = {
        lat: 0,
        lng: 0,
      };
      const geoInfo = {
        countryName: '',
        cc: '',
        tz: 'Africa/Accra',
        toponyms: [
          {
            name: 'Atlantic',
            fullName: 'Atlantic Ocean',
            type: 'SEA',
            ...geo,
          },
        ],
        offset: 0,
      };
      const dtUtc = applyTzOffsetToDateString(dt, geoInfo.offset);

      const ayanamshaKey = notEmptyString(ayanamshaMode, 3)
        ? ayanamshaMode.toLowerCase().replace(/-/g, '_')
        : '';
      const topKeys = [];
      data = await calcCompactChartData(
        dtUtc,
        geo,
        ayanamshaKey,
        topKeys,
        geoInfo.offset,
        false,
        false,
      );
      data = {
        tzOffset: geoInfo.offset,
        tz: geoInfo.tz,
        placenames: geoInfo.toponyms,
        ...data,
      };
    }
    return data;
  }

  async relatedChartSubjects(chartID: string) {
    const criteria = new Map();
    const refChart = await this.chartModel.findById(chartID).select('jd');
    const refJd = refChart instanceof Object ? refChart.jd : 0;
    criteria.set('$or', [
      { _id: ObjectId(chartID) },
      { parent: ObjectId(chartID) },
    ]);
    criteria.set('jd', { $gte: refJd } );
    const items = await this.list(criteria, 0, 500, true, true);
    return items.sort((a, b) => a.jd - b.jd);
  }

  async deleteChart(chartID: string) {
    return await this.chartModel.deleteOne({ _id: chartID }).exec();
  }

  async sanitizePairedCharts(start = 0, limit = 1000) {
    const pcs = await this.getPairedCharts(start, limit);
    const relTypeKeys = matchDefaultVocabOptionKeys('type');
    for (const pc of pcs) {
      const { _id, tags, relType } = pc;
      let newRelType = relType;
      const newTags: SlugNameVocab[] = [];
      if (emptyString(relType)) {
        const first = tags.find(tg =>
          relTypeKeys.includes(tg.slug.replace(/-/g, '_')),
        );
        if (first instanceof Object) {
          newRelType = first.slug.replace(/-/g, '_');
        }
      }
      tags.forEach(tg => {
        if (tg instanceof Object) {
          const { slug, name, vocab } = tg;
          if (notEmptyString(slug)) {
            const slugStr = slug.replace(/-/g, '_');
            const matchedVocab = matchVocabKey(slug);
            const newVocab = notEmptyString(matchedVocab)
              ? matchedVocab
              : notEmptyString(vocab)
              ? vocab
              : 'trait';
            const newTag = {
              slug: slugStr,
              name,
              vocab: newVocab,
            };
            newTags.push(newTag);
          }
        }
      });
      await this.pairedChartModel
        .findByIdAndUpdate(_id, {
          relType: newRelType,
          tags: newTags,
        })
        .exec();
    }
    return pcs.map(pc => pc._id);
  }

  async uniqueTagSlugs() {
    const slugs = await this.pairedChartModel.distinct('relType', {
      relType: /\w+/,
    });
    return slugs instanceof Array ? slugs : [];
  }

  /*
    Development and maintenance
  */
  async savePlanetStations(
    num: number,
    datetime: string,
    days: number,
  ): Promise<any> {
    const jd = calcJulDate(datetime);
    const body = grahaValues.find(b => b.num === num);
    let prevSpeed = 0;
    let data: any = { valid: false };
    for (let i = 0; i < days; i++) {
      const refJd = jd + i;
      data = await calcAcceleration(refJd, body);
      const { start, end } = data;

      if (i > 0) {
        const prevSpeedDiv =
          isNumber(prevSpeed) && prevSpeed !== 0 ? start.speed / prevSpeed : 0;
        const sd1: BodySpeedDTO = {
          num,
          speed: start.spd,
          lng: start.lng,
          jd: start.jd,
          datetime: start.datetime,
          acceleration: prevSpeedDiv,
          station: 'sample',
        };
        await this.saveBodySpeed(sd1);
      }

      const sd2: BodySpeedDTO = {
        num,
        speed: end.speed,
        lng: end.lng,
        jd: end.jd,
        datetime: end.datetime,
        acceleration: data.rate,
        station: 'sample',
      };
      await this.saveBodySpeed(sd2);
      prevSpeed = end.spd;
    }
    return data;
  }

  /*
    Development and maintenance
  */
  async saveBodySpeedStation(
    jd: number,
    num: number,
    station: string,
  ): Promise<BodySpeed> {
    const bs = await calcStation(jd, num, station);
    const saved = await this.saveBodySpeed(bs);
    return saved;
  }

  /*
    Development and maintenance
  */
  async nextPrevStation(
    num: number,
    jd: number,
    stationKey: string,
    prev: boolean,
  ): Promise<BodySpeed> {
    const relCondition = prev ? { $lte: jd } : { $gte: jd };
    const sortDir = prev ? -1 : 1;
    const station = notEmptyString(stationKey, 2)
      ? stationKey
      : { $nin: ['sample', 'peak', 'retro-peak'] };
    const criteria: any = { num, jd: relCondition, station };
    return await this.bodySpeedModel
      .findOne(criteria)
      .sort({ jd: sortDir })
      .limit(1)
      .exec();
  }

  async speedProgress(
    key = '',
    speed = 0,
    jd: number,
  ): Promise<{progress: number; start: number; end: number, peak: number, retro: boolean }> {
    let progress = 0;
    let peak = 0;
    let end = 0;
    let start = 0;
    const direct = speed > 0;
    const retro = !direct;
    const stations = await this._fetchRelatedStations(key, jd, true, direct);
    const stationKeys = stations.length > 0 ? stations.map(st => st.station) : [];
    const startKey = retro? 'retro-start' : 'retro-end';
    const endKey = retro? 'retro-end' : 'retro-start';
    const peakKey = retro? 'retro-peak' : 'peak';
    if (stationKeys.includes(peakKey)) {
      const stSt = stations.find(st => st.station === startKey);
      const pkSt = stations.find(st => st.station === peakKey);
      const stJd = stSt instanceof Object ? stSt.jd : -1;
      const pkStJd = pkSt instanceof Object ? pkSt.jd : -1;
      if (pkStJd < stJd) {
        const peakIndex = stationKeys.indexOf(peakKey);
        stationKeys.splice(peakIndex, 1);
        stations.splice(peakIndex, 1);
      }
    }
    if (stationKeys.length > 0 && stationKeys.length < 3) {
      const nextStations = await this._fetchRelatedStations(key, jd, false, direct, stationKeys);
      if (nextStations.length > 0) {
        nextStations.forEach(st => {
          stations.push(st);
        })
      }
    }
    if (stations.length > 2) {
      const startStation = stations.find(st => st.station === startKey);
      start = startStation instanceof Object ? startStation.jd : -1;
      const endStation = stations.find(st => st.station === endKey);
      end = endStation instanceof Object ? endStation.jd : -1;
      const peakStation = stations.find(st => st.station === peakKey);
      peak = peakStation instanceof Object ? peakStation.speed : 0;
      progress = Math.abs(speed) / Math.abs(peak);
    }
    return {progress, start, end, peak, retro};
  }

  async matchRetroValues(chart: ChartClass): Promise<KeyNumValue[]> {
    const keys = ['me', 've', 'ma', 'ju', 'sa'];
    const values: any[] = [];
    for (const key of keys) {
      const gr = chart.graha(key);
      if (gr instanceof Object) {
        let progVal = -1;
        if (gr.lngSpeed <= 0) {
          const { progress } = await this.speedProgress(key, gr.lngSpeed, chart.jd);
          progVal = progress;
        }
        values.push({key, value: progVal});
      }
    }
    return values;
  }

  async calcExtraScoresForChart(cData = null, vakraScale = 60) {
    let numValues = [];
    if (cData instanceof Object && Object.keys(cData).includes("numValues") && cData.numValues instanceof Array) {
      numValues = cData.numValues;
      
      const chart = cData instanceof ChartClass ? cData : new ChartClass(cData);
      const scores  = await this.matchRetroValues(chart);
      const vkValues = calcVakraBala(scores, vakraScale);
      vkValues.forEach(row => {
        numValues.push({
          key: ['vakrabala', row.key].join('_'),
          value: row.value
        })
      });
      const ubValues = calcUccaBalaValues(chart);
      if (ubValues.length > 0) {
        ubValues.forEach(row => {
          numValues.push({
            key: ['uccabala', row.key].join('_'),
            value: row.value
          })
        });
      }
      const udValues = calcUdayaBalaValues(chart);
      if (udValues.length > 0) {
        udValues.forEach(row => {
          numValues.push({
            key: ['udayabala', row.key].join('_'),
            value: row.value
          })
        });
      }

      const kbValues = calcKsetraBala(chart);
      if (kbValues.length > 0) {
        kbValues.forEach(row => {
          numValues.push({
            key: ['ksetrabala', row.key].join('_'),
            value: row.value
          })
        });
      }
      const nvValues = calcNavamshaBala(chart);
      if (nvValues.length > 0) {
        nvValues.forEach(row => {
          numValues.push({
            key: ['navamshabala', row.key].join('_'),
            value: row.value
          })
        });
      }
    }
    return numValues;
  }

  async _fetchRelatedStations(
    key = '',
    jd: number,
    prev = false,
    direct = false,
    excludeKeys: string[] = []
  ): Promise<BodySpeed[]> {
    const relCondition = prev ? { $lte: jd } : { $gte: jd };
    const sortDir = prev ? -1 : 1;
    const targetKeys = ['retro-start', 'retro-end'];
    if (direct) {
      targetKeys.push('peak');
    } else {
      targetKeys.push('retro-peak');
    }
    const stationKeys =  targetKeys.filter(k => excludeKeys.indexOf(k) < 0);
    const station = { $in: stationKeys };
    const num = matchPlanetNum(key)
    const criteria: any = { num, jd: relCondition, station };
   
    return await this.bodySpeedModel
      .find(criteria)
      .sort({ jd: sortDir })
      .limit(stationKeys.length);
  }

  /*
    Development and maintenance
  */
  async matchStations(key: string, jd: number): Promise<any> {
    const row = grahaValues.find(gr => gr.key === key);
    const num = row instanceof Object ? row.num : -1;
    const nudge = 1 / 1440;
    const prev = await this.nextPrevStation(num, jd, '-', true);
    //const prev2 = await this.nextPrevStation(num, prev.jd - nudge, '-', true);
    const next = await this.nextPrevStation(num, jd, '-', false);
    const next2 = await this.nextPrevStation(num, next.jd + nudge, '-', false);
    const retrograde = prev.station === 'retro-start';
    const nextDirect = retrograde ? jd : next.jd;
    const nextRetro = retrograde ? jd : next.jd;
    const nextLng = next.lng;
    const prevLng = prev.lng;
    const nextPeriod = next2.jd - next.jd;
    const currPeriod = next.jd - prev.jd;
    return {
      retrograde,
      nextDirect,
      nextRetro,
      currPeriod,
      nextPeriod,
      prevLng,
      nextLng,
    };
  }

  /*
    Admin
    AstroWebApp
  */
  async transitionsByPlanet(
    num: number,
    startYear = 2000,
    endYear = 2100,
  ): Promise<Array<SimpleTransition>> {
    const key = ['all-transitions-by-planet', num, startYear, endYear].join(
      '_',
    );
    const storedResults = await this.redisGet(key);
    let results = [];
    if (storedResults instanceof Array && storedResults.length > 0) {
      results = storedResults;
    } else {
      const dbResults = await this._transitionsByPlanet(
        num,
        startYear,
        endYear,
      );
      if (dbResults instanceof Array && dbResults.length > 0) {
        results = dbResults.map(item => {
          const { jd, datetime, num, speed, lng, acceleration, station } = item;
          return { jd, datetime, num, speed, lng, acceleration, station };
        });
        this.redisSet(key, results);
      }
    }
    return results;
  }

  /*
   * Admin, AstroWebApp
   */
  async _transitionsByPlanet(
    num: number,
    startYear = 2000,
    endYear = 2100,
  ): Promise<Array<BodySpeed>> {
    const station = { $ne: 'sample' };
    const otherParams = { month: 1, day: 1, hour: 0 };
    const startJd = calcJulDateFromParts({ year: startYear, ...otherParams });
    const endJd = calcJulDateFromParts({ year: endYear, ...otherParams });
    const jd = { $gte: startJd, $lte: endJd };
    const criteria = num >= 0 ? { num, station, jd } : { station, jd };
    const data = await this.bodySpeedModel
      .find(criteria)
      .sort({ jd: 1 })
      .limit(25000)
      .exec();
    return data;
  }

  /*
   * Development and Maintenance
   */
  async speedPatternsByPlanet(num: number): Promise<Array<BodySpeed>> {
    let minJd = 0;
    const last2 = await this.bodySpeedModel
      .find({ num, station: { $ne: 'sample' } })
      .sort({ jd: -1 })
      .limit(2)
      .exec();

    if (last2 instanceof Array && last2.length > 1) {
      minJd = last2[1].jd;
    }
    const data = await this.bodySpeedModel
      .find({ num, station: 'sample', jd: { $gt: minJd } })
      .sort({ jd: 1 })
      .limit(5000)
      .exec();
    const results: Array<BodySpeed> = [];
    if (data instanceof Array && data.length > 0) {
      let maxSpd = 0;
      let minSpd = 0;
      let maxMatched = false;
      let minMatched = false;
      let currPolarity = 1;
      let prevPolarity = 1;
      let prevRow: any = null;
      let rowsMatched = 0;
      data.forEach(row => {
        currPolarity = row.speed >= 0 ? 1 : -1;
        if (currPolarity > 0) {
          if (row.speed > maxSpd) {
            maxSpd = row.speed;
          } else if (!maxMatched && prevRow instanceof Object) {
            maxMatched = true;
            if (rowsMatched < 4) {
              results.push(prevRow);
              this.saveBodySpeedStation(prevRow.jd, num, 'peak');
            }
            rowsMatched++;
            maxSpd = -1;
          }
        }
        if (currPolarity < 0) {
          if (row.speed < minSpd) {
            minSpd = row.speed;
          } else if (!minMatched && prevRow instanceof Object) {
            minMatched = true;
            if (rowsMatched < 4) {
              results.push(prevRow);
              this.saveBodySpeedStation(prevRow.jd, num, 'retro-peak');
            }
            rowsMatched++;
            minSpd = 1;
          }
        }
        if (currPolarity !== prevPolarity && prevRow instanceof Object) {
          rowsMatched++;
          maxMatched = false;
          minMatched = false;
          maxSpd = -1;
          minSpd = 1;
          const rs = prevPolarity < 0 ? 'retro-end' : 'retro-start';
          this.saveBodySpeedStation(prevRow.jd, num, rs);
          results.push(row);
        }
        prevPolarity = currPolarity;
        prevRow = Object.assign({}, row.toObject());
        if (rowsMatched >= 4) {
          rowsMatched = 0;
        }
      });
    }
    return results;
  }

  async planetStations(
    num: number,
    datetime: string,
    fetchCurrent = false,
  ): Promise<Array<any>> {
    const fetchCurrentStr = fetchCurrent ? 'curr' : 'not';
    const key = ['planet-stations', num, datetime, fetchCurrentStr].join('_');
    let results = await this.redisGet(key);
    const valid = results instanceof Array && results.length > 0;
    if (valid) {
      return results;
    } else {
      results = await this._planetStations(num, datetime, fetchCurrent);
      if (results instanceof Array) {
        this.redisSet(key, results);
      }
    }
    return results;
  }

  async _planetStations(
    num: number,
    datetime: string,
    fetchCurrent = false,
  ): Promise<Array<any>> {
    const data = new Map<string, any>();
    data.set('valid', false);
    const stations = ['peak', 'retro-start', 'retro-peak', 'retro-end'];
    const assignDSRow = (
      data: Map<string, any>,
      station: string,
      mode: string,
      row: any,
    ) => {
      const { num, jd, datetime, lng, speed } = row;
      const ds = { num, jd, datetime, lng, speed, retro: speed < 0 };
      data.set([mode, station].join('__'), ds);
    };
    if (isNumeric(num) && validISODateString(datetime)) {
      const jd = calcJulDate(datetime);
      if (fetchCurrent) {
        const current = await calcAcceleration(jd, { num });
        if (current instanceof Object) {
          const { start, end } = current;
          if (start instanceof Object) {
            data.set('current__spot', {
              ...start,
              retro: start.speed < 0,
              num,
            });
            data.set('current__plus-12h', {
              ...end,
              retro: end.speed < 0,
              num,
              acceleration: current.rate,
              rising: current.rising,
              switching: current.switching,
            });
          }
        }
      }
      for (const station of stations) {
        const row = await this.nextPrevStation(num, jd, station, true);
        if (row instanceof Object) {
          assignDSRow(data, station, 'prev', row);
        }
        const row2 = await this.nextPrevStation(num, jd, station, false);
        if (row2 instanceof Object) {
          assignDSRow(data, station, 'next', row2);
        }
      }
    }
    const results: Array<any> = [];
    [...data.entries()].forEach(entry => {
      const [key, row] = entry;
      if (row instanceof Object) {
        results.push({
          station: key,
          ...row,
        });
      }
    });
    results.sort((a, b) => a.jd - b.jd);
    return results;
  }

  async fetchBavTimeline(
    geo: LngLat,
    startJd = 0,
    endJd = 0,
  ): Promise<SignTimelineSet[]> {
    const key = ['bav_timeline', startJd.toFixed(2), endJd.toFixed(2)].join('_');
    const storedResults = await this.redisGet(key);
    const hasStored =
      storedResults instanceof Array && storedResults.length > 5;
    const grahas = hasStored
      ? storedResults
      : await calcCoreSignTimeline(startJd, endJd);
    if (!hasStored && grahas instanceof Array && grahas.length > 5) {
      this.redisSet(key, grahas);
    }
    const ascKey = [
      'bav_asc_timeline',
      geo.lat.toFixed(3),
      geo.lng.toFixed(3),
      startJd.toFixed(2),
      endJd.toFixed(2),
    ].join('_');
    const storedAscResult = await this.redisGet(ascKey);
    const hasAscStored = storedAscResult instanceof Object;
    const ascSet = hasAscStored
      ? storedAscResult
      : await calcAscendantTimelineSet(geo, startJd, endJd);
    if (ascSet instanceof Object) {
      grahas.push(ascSet);
      if (!hasAscStored) {
        this.redisSet(ascKey, ascSet);
      }
    }
    return grahas;
  }

  async fetchKakshaTimeline(
    geo: LngLat,
    startJd = 0,
    endJd = 0,
    excludeKeys = [],
  ): Promise<SignTimelineSet[]> {
    const includeAscendant = excludeKeys.includes('as') === false;
    const keyParts = ['kakshya_tl', startJd, endJd];
    const excludeMoon = excludeKeys.includes('mo');
    if (excludeMoon) {
      keyParts.push('ex_mo');
    }
    const key = keyParts.join('_');
    const storedResults = await this.redisGet(key);
    const hasStored =
      storedResults instanceof Array && storedResults.length > 5;
    const grahas = hasStored
      ? storedResults
      : await calcCoreKakshaTimeline(startJd, endJd, excludeMoon);
    if (!hasStored && grahas instanceof Array && grahas.length > 5) {
      this.redisSet(key, grahas);
    }
    if (includeAscendant) {
      const ascKey = [
        'kakshya_asc_tl',
        geo.lat.toFixed(3),
        geo.lng.toFixed(3),
        startJd,
        endJd,
      ].join('_');
      const storedAscResult = await this.redisGet(ascKey);
      const hasAscStored = storedAscResult instanceof Object;
      const ascSet = hasAscStored
        ? storedAscResult
        : await calcAscendantKakshaSet(geo, startJd, endJd);
      if (ascSet instanceof Object) {
        const lng = Object.keys(ascSet).includes('lng')
          ? ascSet.lng
          : ascSet.longitude;
        const sign = Math.floor(lng / 30) + 1;
        grahas.push({ ...ascSet, lng, sign });
        if (!hasAscStored) {
          this.redisSet(ascKey, ascSet);
        }
      }
    }
    return grahas;
  }

  async fetchKakshaTimelineData(
    chartID = '',
    geo: GeoPos,
    startJd = 0,
    endJd = 0,
    excludeKeys = [],
    ayanamshaKey = 'true_citra',
  ) {
    const chartData = await this.getChart(chartID);
    const simpleChart =
      chartData instanceof Object
        ? simplifyChart(chartData, ayanamshaKey)
        : null;
    const birthGrahas =
      simpleChart instanceof Object
        ? simpleChart.grahas.map(gr => {
            const { key, lng, sign } = gr;
            return { key, lng, sign };
          })
        : [];
    const ascendantLng = simpleChart.ascendant;
    birthGrahas.push({
      key: 'as',
      lng: ascendantLng,
      sign: Math.floor(ascendantLng / 30) + 1,
    });
    const keys = ['sa', 'ju', 'ma', 'su', 've', 'me', 'mo', 'as'];
    const lngs = keys.map(key => {
      const gr = birthGrahas.find(g => g.key === key);
      const lng = gr instanceof Object ? gr.lng : 0;
      return { key, lng };
    });
    const kakshyaKeys = keys.filter(k => excludeKeys.includes(k) === false);

    const bavGrid = getAshtakavargaBodyGrid(lngs, simpleChart.jd);

    const grahaItems = await this.fetchKakshaTimeline(
      geo,
      startJd,
      endJd,
      excludeKeys,
    );
    const times = grahaItems
      .map(row => {
        const { key, jd, dt, longitude, sign, nextMatches } = row;
        const first = { key, jd, dt, lng: longitude, sign };
        const subs = nextMatches.map(r => {
          const { jd, dt, lng, sign } = r;
          return { key, jd, dt, lng, sign };
        });
        return [first, ...subs];
      })
      .reduce((a, b) => a.concat(b), [])
      .filter(sub => sub.jd < endJd);
    times.sort((a, b) => a.jd - b.jd);
    const rows = [];
    const kakshyaMap: Map<number, any> = new Map();
    const numKeys = kakshyaKeys.length;

    times.forEach((row) => {
      const index96 = Math.floor(row.lng / (360 / 96));
      const num = index96 + 1;
      const kakshyaIndex = index96 % 8;
      const kakshyaKey = keys[kakshyaIndex];
      const rowIndex = keys.indexOf(row.key);
      const signIndex = Math.floor(row.lng / 30);
      const bavRow =
        signIndex >= 0 && signIndex < bavGrid.length
          ? bavGrid[signIndex]
          : null;
      const bavValueRows = bavRow instanceof Object ? bavRow.values : [];
      const bavKeys =
        kakshyaIndex < bavValueRows.length
          ? bavValueRows[kakshyaIndex].values
          : [];
      if (notEmptyString(kakshyaKey)) {
        kakshyaMap.set(rowIndex, {
          lord: kakshyaKey,
          lng: row.lng,
          hasBindu: bavKeys.includes(kakshyaKey),
          sign: Math.floor(row.lng / 30) + 1,
          num,
        });
        if (kakshyaMap.size === numKeys) {
          rows.push({
            jd: row.jd,
            items: [...kakshyaMap.entries()].map(entry => {
              const [subIndex, value] = entry;
              const key = keys[subIndex];
              return { key, ...value };
            }),
          });
        }
      }
    });
    return { rows, datetime: chartData.datetime, geo: chartData.geo };
  }

}
