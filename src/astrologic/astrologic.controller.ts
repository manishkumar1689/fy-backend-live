import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { isValidObjectId, Model } from 'mongoose';
import { AstrologicService } from './astrologic.service';
import { GeoService } from './../geo/geo.service';
import { UserService } from './../user/user.service';
import { SettingService } from './../setting/setting.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { CreateChartDTO } from './dto/create-chart.dto';
import {
  isNumeric,
  validISODateString,
  notEmptyString,
  isNumber,
  isLocationString,
  validLocationParameter,
  validEmail,
} from '../lib/validators';
import {
  correctDatetime,
  latLngParamsToGeo,
  locStringToGeo,
} from './lib/converters';
import {
  addExtraPanchangaNumValuesFromClass,
  addExtraPanchangaNumValues,
  applyAscendantToSimpleChart,
  simplifyAstroChart,
  simplifyChart,
  simplifyConditions,
} from './lib/member-charts';
import {
  calcAllTransitions,
  fetchHouseData,
  calcBodiesInHouses,
  calcVargas,
  calcPanchanga,
  calcMrityubhagaValues,
  calcSphutaData,
  calcCompactChartData,
  calcAllAspects,
  calcBodyJd,
  calcAyanamsha,
  fetchHouseDataJd,
  calcCoreGrahaPositions,
  calcAllStars,
  calcDeclination,
  buildExtendedTransitions,
  calcBaseLngSetJd,
  toSimplePositions,
} from './lib/core';
import {
  calcAltitudeResult,
  calcAltitudeSE,
  calcTransposedObjectTransitionsSimple,
} from './lib/point-transitions';
import { sampleBaseObjects } from './lib/custom-transits';
import {
  calcJulDate,
  applyTzOffsetToDateString,
  toShortTzAbbr,
  jdToDateTime,
  utcDate,
  julToISODate,
  currentISODate,
  durationStringToDays,
  matchJdAndDatetime,
  julToUnixTime,
  matchLocaleJulianDayData,
} from './lib/date-funcs';
import {
  toIndianTime,
  calcTransition,
  calcTransitionJd,
} from './lib/transitions';
import { ChartInputDTO } from './dto/chart-input.dto';
import { smartCastInt, smartCastFloat, smartCastBool } from '../lib/converters';
import { PairedChartInputDTO } from './dto/paired-chart-input.dto';
import {
  midPointSurface,
  medianLatlng,
  subtractLng360,
  approxTransitTimes,
} from './lib/math-funcs';
import { PairedChartDTO } from './dto/paired-chart.dto';
import { Kuta } from './lib/kuta';
import {
  basicSetToFullChart,
  Chart,
  generateBasicChart,
} from './lib/models/chart';
import { AspectSet, calcOrb } from './lib/calc-orbs';
import { AspectSetDTO } from './dto/aspect-set.dto';
import {
  assessChart,
  compatibilityResultSetHasScores,
  Condition,
  matchOrbFromGrid,
  matchPanchaPakshiOptions,
  PredictiveRule,
  Protocol,
} from './lib/models/protocol-models';
import {
  extractCorePlaceNames,
  mapGeoPlacenames,
  mapNestedKaranaTithiYoga,
} from './lib/mappers';
import { TagReassignDTO } from './dto/tag-reassign.dto';
import { TagDTO } from './dto/tag.dto';
import { RuleSetDTO } from '../setting/dto/rule-set.dto';
import { matchPlanetNum } from './lib/settings/graha-values';
import { CreateUserDTO } from '../user/dto/create-user.dto';
import {
  assignDashaBalances,
  DashaBalance,
  matchDashaSubsetFromChart,
} from './lib/models/dasha-set';
import {
  calcNextAscendantLng,
  calcOffsetAscendant,
} from './lib/calc-ascendant';
import { GeoLoc } from './lib/models/geo-loc';
import { GeoPos } from './interfaces/geo-pos';
import { processPredictiveRuleSet } from './lib/predictions';
import {
  calculatePanchaPakshiData,
  panchaPakshiDayNightSet,
} from './lib/settings/pancha-pakshi';
import { PairsSetDTO } from './dto/pairs-set.dto';
import {
  buildProgressSetPairs,
  buildSingleProgressSetKeyValues,
  calcProgressAspectDataFromProgressItems,
  calcProgressSummary,
} from './lib/settings/progression';
import { objectToMap } from '../lib/entities';
import { PreferenceDTO } from '../user/dto/preference.dto';
import { calcPreviousMidnightJd } from './lib/julian-date';
import { process5PRulesWithPeaks, processTransitionData } from './lib/calc-5p';

@Controller('astrologic')
export class AstrologicController {
  constructor(
    private astrologicService: AstrologicService,
    private geoService: GeoService,
    private userService: UserService,
    private settingService: SettingService,
    private dictionaryService: DictionaryService,
  ) {}

  /*
    #mobile
    #astrotesting
  */
  @Put('edit-chart/:chartID')
  async updateChart(
    @Res() res,
    @Param('chartID') chartID,
    @Body() chartDTO: ChartInputDTO,
  ) {
    const currChart = await this.astrologicService.getChart(chartID);
    let valid = false;
    let chart: any = null;
    if (currChart instanceof Object) {
      const currData = currChart.toObject();
      const currInputData = {
        datetime: currData.datetime,
        jd: currData.jd,
        ...currData.geo,
        ...currData.subject,
      };
      const inData = {
        ...currInputData,
        ...chartDTO,
      } as ChartInputDTO;
      const saveData = await this.saveChartData(inData, true, chartID);
      valid = saveData.valid;
      chart = saveData.chart;
    }
    res.send({
      valid,
      chart,
    });
  }

  /*
    #mobile
    #astrotesting
  */
  @Get('transition/:loc/:dt/:planet')
  async transition(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('planet') planet,
  ) {
    let planetNum = 0;
    const geo = locStringToGeo(loc);
    let data: any = { valid: false };
    if (isNumeric(planet)) {
      planetNum = parseInt(planet);
      data = await calcTransition(dt, geo, planetNum);
    }
    res.send(data);
  }

  /*
    #mobile
    #astrotesting
  */
  @Get('transitions/:loc/:dt/:modeRef?/:adjustMode?')
  async transitions(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('modeRef') modeRef,
    @Param('adjustMode') adjustMode,
  ) {
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const { dtUtc, jd } = matchJdAndDatetime(dt);
      const data: any = await buildExtendedTransitions(
        geo,
        jd,
        modeRef,
        adjustMode,
      );
      if (data.showGeoData) {
        data.geo = await this.geoService.fetchGeoAndTimezone(
          geo.lat,
          geo.lng,
          dtUtc,
          'compact',
        );
        data.chart = await this.fetchCompactChart(
          loc,
          dt,
          'top',
          'top',
          false,
          true,
        );
      }
      return res.status(HttpStatus.OK).json(data);
    } else {
      const result = {
        valid: false,
        message: 'Invalid parameters',
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
  }

  /*
    #astrotesting
  */
  @Get('base-objects/:loc/:dt/:show?')
  async basObjects(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('show') show,
  ) {
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const showSamples = show === 'samples';
      const { dtUtc, jd } = matchJdAndDatetime(dt);
      // not taking into account birth ascendant for LOF/LoS in non-birth charts
      const refChart = new Chart(null);
      const data = await sampleBaseObjects(jd, geo, refChart, showSamples);
      return res.status(HttpStatus.OK).json({ dtUtc, ...data });
    } else {
      const result = {
        valid: false,
        message: 'Invalid parameters',
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
  }

  /*
    #mobile
  */
  @Get('pancha-pakshi/:chartRef/:loc/:dt?/:mode?')
  async panchaPanchaDaySet(
    @Res() res,
    @Param('chartRef') chartRef,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('mode') mode,
  ) {
    let status = HttpStatus.BAD_REQUEST;
    let data: Map<string, any> = new Map(
      Object.entries({
        valid: false,
        message: '',
      }),
    );
    const fetchNightAndDay = ['dual', 'trans', 'rules', 'debug'].includes(mode);
    const showTransitions = ['trans', 'rules', 'debug'].includes(mode);
    const processRules = ['rules', 'debug'].includes(mode);
    const debugMode = mode === 'debug';
    let chartID = chartRef;
    if (chartRef.includes('@') && chartRef.includes('.')) {
      chartID = await this.astrologicService.getChartIDByEmail(chartRef);
    }
    if (notEmptyString(chartID) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const { dtUtc, jd } = matchJdAndDatetime(dt);
      const chartData = await this.astrologicService.getChart(chartID);
      const hasChart = chartData instanceof Model;
      const valid = hasChart && chartData.grahas.length > 1;
      data.set('valid', valid);
      if (valid) {
        const chartObj = hasChart ? chartData.toObject() : {};
        const chart = new Chart(chartObj);
        const rules = processRules
          ? await this.settingService.getPPRules()
          : [];
        const customCutoff = await this.settingService.getPPCutoff();
        data = await calculatePanchaPakshiData(
          chart,
          jd,
          geo,
          rules,
          showTransitions,
          fetchNightAndDay,
          true,
          customCutoff,
          debugMode,
        );
        if (data.get('valid') === true) {
          status = HttpStatus.OK;
        }
      }
      data.set('jd', jd);
      data.set('dtUtc', dtUtc);
    } else {
      data.set('message', 'Invalid parameters');
    }
    return res.status(status).json(Object.fromEntries(data));
  }

  /*
  * Mobile / astrotesting
  */
  @Get('lucky-times/:chartRef/:loc/:dt?/:dtMode?')
  async ppLuckyTimes(
    @Res() res,
    @Param('chartRef') chartRef,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('dtMode') dtMode,
    @Query() query,
  ) {
    let chartID = await this.astrologicService.getChartIDByUserRef(chartRef);
    if (!notEmptyString(chartID, 12)) {
      chartID = chartRef;
    }
    const dateMode = notEmptyString(dtMode) ? dtMode.toLowerCase() : 'simple';
    const result: Map<string, any> = new Map();
    result.set('valid', false);
    result.set('chartId', chartID);
    let status = HttpStatus.BAD_REQUEST;
    const paramKeys = query instanceof Object ? Object.keys(query) : [];
    if (notEmptyString(chartID) && notEmptyString(loc, 3)) {
      const showRules = paramKeys.includes('rules')
        ? smartCastInt(query.rules, 0) > 0
        : false;
      const showYamas = paramKeys.includes('yamas')
        ? smartCastInt(query.yamas, 0) > 0
        : false;
      const geo = locStringToGeo(loc);
      const { dtUtc, jd } = matchJdAndDatetime(dt);
      const chartData = await this.astrologicService.getChart(chartID);
      const hasChart = chartData instanceof Model;
      const valid = hasChart && chartData.grahas.length > 1;
      result.set('dtUtc', dtUtc);
      const refDt = new Date(dtUtc);
      const refDtStr = refDt
        .toISOString()
        .split('.')
        .shift();

      const timeInfo = await this.geoService.fetchTzData(geo, refDtStr);

      const midNightJd = calcPreviousMidnightJd(timeInfo.tzOffset, jd);

      const endJd = midNightJd + 1;
      if (valid) {
        const cutoff = await this.settingService.getPPCutoff();
        result.set('cutoff', cutoff);
        result.set('jd', jd);
        result.set('startJd', midNightJd);
        result.set('endJd', endJd);
        result.set('tzOffset', timeInfo.tzOffset);
        const rules = await this.settingService.getPPRules();

        const chartObj = chartData.toObject();
        const chart = new Chart(chartObj);
        const startScanJd = jd - 0.5;
        const positions = toSimplePositions(chart, 'special');

        const trData = await this.astrologicService.fetchCurrentAndTransposedTransitions(
          positions,
          startScanJd,
          geo,
          chart.geo,
          chart.isDayTime,
        );

        const transitions = processTransitionData(trData, midNightJd, endJd);
        const ppData = await process5PRulesWithPeaks(
          chart,
          [jd, midNightJd, endJd],
          geo,
          transitions,
          rules,
          cutoff,
          timeInfo.tzOffset,
          showRules,
          dateMode,
        );
        const ppKeys = ppData.keys();
        const excludeKeys = ['rules', 'span'];
        if (!showYamas) {
          excludeKeys.push('yamas1', 'yamas2', 'ruleJds', 'totalMatched');
        }
        for (const ppKey of ppKeys) {
          if (excludeKeys.includes(ppKey) === false) {
            result.set(ppKey, ppData.get(ppKey));
          }
        }
        if (showRules) {
          if (ppData.has('rules')) {
            const ppRules = ppData.get('rules');
            if (ppRules instanceof Array && ppRules.length > 0) {
              result.set('rules', rules);
            }
          }
        }
        result.set('valid', valid);

        status = HttpStatus.OK;
      }
    }
    return res.status(status).json(Object.fromEntries(result));
  }

  /*
    #astrotesting
  */
  @Get('pancha-pakshi-pair/:u1/:u2/:dt?')
  async pankshaPanchaPairDaySet(
    @Res() res,
    @Param('u1') u1,
    @Param('u2') u2,
    @Param('dt') dt,
  ) {
    let status = HttpStatus.BAD_REQUEST;
    const data: Map<string, any> = new Map(
      Object.entries({
        jd: 0,
        dtUtc: '',
        valid: false,
        geo1: null,
        geo2: null,
        p1: null,
        p2: null,
      }),
    );

    if (notEmptyString(u1, 20) && notEmptyString(u2, 12)) {
      if (u1 === u2) {
        data.set('message', 'IDs refer to the same user');
      } else {
        const user1 = await this.userService.getUser(u1, ['geo']);
        const user2 = await this.userService.getUser(u2, ['geo']);
        if (user1 instanceof Object && user2 instanceof Object) {
          const geo1 = user1.geo;
          const geo2 = user2.geo;
          data.set('geo1', geo1);
          data.set('geo2', geo2);
          const { dtUtc, jd } = matchJdAndDatetime(dt);
          data.set('jd', jd);
          data.set('dtUtc', dtUtc);
          const c1Data = await this.astrologicService.getUserBirthChart(u1);
          const c2Data = await this.astrologicService.getUserBirthChart(u2);
          const hasChart = c1Data instanceof Model && c2Data instanceof Model;
          const valid =
            hasChart && c1Data.grahas.length > 1 && c2Data.grahas.length > 1;
          if (valid) {
            const c1Obj = hasChart ? c1Data.toObject() : {};
            const c2Obj = hasChart ? c2Data.toObject() : {};
            const chart1 = new Chart(c1Obj);
            const chart2 = new Chart(c2Obj);
            const ppData1 = await panchaPakshiDayNightSet(
              jd,
              geo1,
              chart1,
              true,
            );
            const ppData2 = await panchaPakshiDayNightSet(
              jd,
              geo2,
              chart2,
              true,
            );
            if (ppData1.get('valid')) {
              data.set('p1', Object.fromEntries(ppData1.entries()));
              data.set('p2', Object.fromEntries(ppData2.entries()));
              data.set('message', 'valid data set');
              data.set('valid', true);
              status = HttpStatus.OK;
            } else {
              data.set('message', 'Invalid data');
            }
          } else {
            data.set('message', 'Missing chart(s)');
          }
        } else {
          data.set('message', 'Invalid user IDs');
        }
      }
    } else {
      data.set('message', 'Invalid parameters');
    }
    return res.status(status).json(Object.fromEntries(data));
  }


  @Get('core-grahas/:loc/:dt/:ayanamsha?')
  async coreGrahasByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('ayanamsha') ayanamsha,
  ) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const ayanamshaKey = notEmptyString(ayanamsha) ? ayanamsha : 'true_citra';
      data = await calcCoreGrahaPositions(dt, geo, ayanamshaKey);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /*
  #AstroUI / #testing

  Fetch progression longitudes for the Su, Ve and Ma
  along with the core graha longitudes, including the ascendant and descendant
  for the birth data.
  This data can be extracted either from pairs of birth datetime and location parameters (dt1, dt2, loc1, loc2) 
  or from the ids of existing chart records, i.e. c1 and c2.
  The resulting progression sets will be symmetrical at 1/4 year intervals.
  The year span is controlled by the year and future parameters defaulting to 20 and 5 respectively. 
  This means a 20 year span starting at the beginning of the year 15 (20-5) nyears before the current date and extending 20 years.
  e.g. current date 17/03/2022
  years = 30
  future = 10
  startDate: 01/01/2002
  endDate: 2031/12/31
  dt1: dateString for person 1
  loc1: location string for person 1
  dt2: dateString for person 2
  loc2: location string for person 2
  iso=1: Output UTC ISO datetime in the progression steps
  puid: Public user ID (will be saved as the current user)
  refNum: paired chart ref number. Defaults to 1
  */
  @Get('p2')
  async getProgressionPositions(@Res() res, @Query() query) {
    const data: any = { valid: false };
    const params = objectToMap(query);
    const dt1 = params.has('dt1') ? params.get('dt1') : '';
    const dt2 = params.has('dt2') ? params.get('dt2') : '';
    const ayanamsha = params.has('ayanamsha')
      ? params.get('ayanamsha')
      : 'true_citra';
    const loc1 = params.get('loc1');
    const loc2 = params.get('loc2');
    const years = params.get('years');
    const yearsInt = isNumeric(years) ? smartCastInt(years) : 20;
    const future = params.get('future');
    const futureInt = isNumeric(future) ? smartCastInt(future) : 5;
    const futureFrac = futureInt / yearsInt;
    const extended = params.get('extended')
      ? smartCastInt(params.get('extended'), 0) > 0
      : false;
    const hasGeo1 = isLocationString(loc1);
    const hasGeo2 = isLocationString(loc2);
    const geo1 = hasGeo1 ? locStringToGeo(loc1) : null;
    const geo2 = hasGeo2 ? locStringToGeo(loc2) : null;
    const publicUserId = params.has('puid') ? params.get('puid') : '';
    const hasPublicUserId = isValidObjectId(publicUserId);
    const userId = params.has('uid') ? params.get('uid') : '';
    const hasUserId = isValidObjectId(userId);

    const c1 = params.get('c1');
    const c2 = params.get('c2');
    const useCharts = isValidObjectId(c1) && isValidObjectId(c2);

    const showIsoDates = params.has('iso')
      ? smartCastInt(params.get('iso'), 0) > 0
      : false;
    const progressKeys = extended
      ? ['su', 'mo', 'me', 've', 'ma', 'ju', 'sa', 'ur', 'ne', 'pl', 'ra', 'ke']
      : ['su', 've', 'ma'];
    const ayanamshaKey = notEmptyString(ayanamsha) ? ayanamsha : 'true_citra';
    let jd1 = 0;
    let jd2 = 0;
    let p1Base: any = {};
    let p2Base: any = {};
    let showProgressSummary = false;
    const sub1 = {
      name: '',
      gender: '',
      roddenValue: 0,
      geo: geo1,
      placeName: '',
      tzOffset: 0,
    };
    const sub2 = { ...sub1, geo: geo2 };
    if (validISODateString(dt1) && validISODateString(dt2)) {
      jd1 = calcJulDate(dt1);
      jd2 = calcJulDate(dt2);
      p1Base = await calcBaseLngSetJd(jd1, geo1, hasGeo1, ayanamshaKey);
      p2Base = await calcBaseLngSetJd(jd2, geo2, hasGeo2, ayanamshaKey);
      if (params.has('n1')) {
        sub1.name = params.get('n1');
      }
      if (params.has('n2')) {
        sub2.name = params.get('n2');
      }
      if (params.has('g1')) {
        sub1.gender = params.get('g1');
      }
      if (params.has('g2')) {
        sub2.gender = params.get('g2');
      }
      if (params.has('r1')) {
        sub1.roddenValue = smartCastInt(params.get('r1'));
      }
      if (params.has('r2')) {
        sub2.roddenValue = smartCastInt(params.get('r2'));
      }
      if (params.has('pl1')) {
        sub1.placeName = params.get('pl1');
      }
      if (params.has('pl2')) {
        sub2.placeName = params.get('pl2');
      }
      if (params.has('to1')) {
        sub1.tzOffset = smartCastInt(params.get('to1'));
      }
      if (params.has('to2')) {
        sub2.tzOffset = smartCastInt(params.get('to2'));
      }
      if (params.has('scores')) {
        showProgressSummary = smartCastInt(params.get('scores')) > 0;
      }
    } else if (useCharts) {
      const co1 = await this.astrologicService.getChart(c1);
      const co2 = await this.astrologicService.getChart(c2);
      if (co1 instanceof Object && co2 instanceof Object) {
        const chart1 = new Chart(co1.toObject());
        const chart2 = new Chart(co2.toObject());
        jd1 = chart1.jd;
        jd2 = chart2.jd;
        p1Base = chart1.toBaseSet();
        p2Base = chart2.toBaseSet();
        sub1.name = chart1.name;
        sub2.name = chart2.name;
        sub1.gender = chart1.gender;
        sub2.gender = chart2.gender;
        sub1.roddenValue = chart1.subject.roddenValue;
        sub2.roddenValue = chart2.subject.roddenValue;
        sub1.tzOffset = chart1.tzOffset;
        sub2.tzOffset = chart2.tzOffset;
      }
    }
    if (jd1 > 0 && jd2 > 0) {
      const progressData = await buildProgressSetPairs(
        jd1,
        jd2,
        yearsInt,
        4,
        futureFrac,
        progressKeys,
        showIsoDates,
      );
      const p1 = {
        ...p1Base,
        dt: julToISODate(jd1),
      };
      data.p1 = {
        ...sub1,
        ...p1,
        progressSets: progressData.p1,
      };
      const p2 = {
        ...p2Base,
        dt: julToISODate(jd2),
      };
      data.p2 = {
        ...sub2,
        ...p2,
        progressSets: progressData.p2,
      };
      if (showProgressSummary) {
        const customConfig = await this.settingService.p2Scores();
        const pd = await this.astrologicService.progressAspectsFromJds(
          jd1,
          jd2,
        );
        data.summary = calcProgressSummary(pd.items, true, customConfig);
        data.items = pd.items;
      }
      data.key = '';
      data.valid = progressData.p2.length > 0;
      if (hasPublicUserId || hasUserId) {
        const pairKeyRef = params.has('pn') ? params.get('pn') : '';
        const pairNum = isNumeric(pairKeyRef) ? smartCastInt(pairKeyRef) : 1;
        const simpleChartKey = ['astro_pair', pairNum].join('_');
        data.key = simpleChartKey;
        const pref = {
          key: simpleChartKey,
          type: 'simple_astro_pair',
          value: {
            ayanamshaKey,
            p1: {
              ...sub1,
              ...p1,
            },
            p2: {
              ...sub2,
              ...p2,
            },
          },
        } as PreferenceDTO;
        if (hasPublicUserId) {
          this.userService.savePublicPreference(publicUserId, pref);
        } else {
          this.userService.savePreference(userId, pref);
        }
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #testing
  */
  @Get('p2-simple/:c1/:c2')
  async getProgressionSimple(@Res() res, @Param('c1') c1, @Param('c2') c2) {
    const data: any = {
      valid: false,
      num: 0,
      numWithAspects: 0,
      jd1: 0,
      jd2: 0,
      items: [],
    };
    const co1 = await this.astrologicService.getChart(c1);
    const co2 = await this.astrologicService.getChart(c2);
    if (co1 instanceof Object && co2 instanceof Object) {
      const chart1 = new Chart(co1.toObject());
      const chart2 = new Chart(co2.toObject());
      let pd: any = { num: 0, jd1: 0, jd2: 0, items: [], numWithAspects: 0 };
      if (chart1.hasCurrentProgressItems && chart2.hasCurrentProgressItems) {
        pd = calcProgressAspectDataFromProgressItems(
          chart1.matchProgressItems(),
          chart2.matchProgressItems(),
        );
      } else {
        pd = await this.astrologicService.progressAspectsFromJds(
          chart1.jd,
          chart2.jd,
        );
      }
      if (pd.num > 0) {
        const customConfig = await this.settingService.p2Scores();
        data.num = pd.num;
        data.numWithAspects = pd.numWithAspects;
        data.jd1 = pd.jd1;
        data.jd2 = pd.jd2;
        data.items = pd.items;
        data.summary = calcProgressSummary(pd.items, true, customConfig);
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #mobile ??
    #astrotesting
  */
  @Get('position-data/:loc?/:dt?/:user?/:ayanamsha?')
  async corePositionsAndPredictions(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('user') user,
    @Param('ayanamsha') ayanamsha,
  ) {
    const dtStr = validISODateString(dt) ? dt : currentISODate();
    const datetime = correctDatetime(dtStr);
    const geo = isLocationString(loc) ? locStringToGeo(loc) : null;
    const hasGeo = geo instanceof Object;
    const ayanamshaKey = notEmptyString(ayanamsha) ? ayanamsha : 'truefcitra';
    const result = await this.astrologicService.getGrahaPositions(
      datetime,
      geo,
      hasGeo,
      ayanamshaKey,
    );
    const grahaKeys = [
      'su',
      'mo',
      'ma',
      'me',
      'ju',
      've',
      'sa',
      'ra',
      'ke',
      'ur',
      'ne',
      'pl',
    ];
    if (hasGeo) {
      grahaKeys.unshift('as');
    }
    const lngEntries = result.valid
      ? grahaKeys.map(gk => {
          const row = result.items.find(g => g.key === gk);
          const lng = row instanceof Object ? row.lng : 0;
          return [gk, lng];
        })
      : [];
    const longitudes = Object.fromEntries(lngEntries);
    const adminIds = await this.userService.getAdminIds();
    const predictionSets = await this.settingService.getRuleSets(
      adminIds,
      true,
    );
    const predictions = [];
    if (notEmptyString(user, 20)) {
      const chartData = await this.astrologicService.getUserBirthChart(user);
      if (chartData instanceof Model) {
        const chart = new Chart(chartData.toObject());

        for (const rs of predictionSets) {
          const pr = await this.fetchPredictions(rs, chart, geo);
          const { conditionRefs, operator } = rs.conditionSet;
          const conditions = simplifyConditions(conditionRefs);
          const toTimes = (jd = 0) => {
            return {
              jd,
              ts: Math.floor(julToUnixTime(jd)),
              dt: julToISODate(jd),
            };
          };
          const toInfo = item => {
            const entries = Object.entries(item).filter(
              entry => ['start', 'end', 'valid'].includes(entry[0]) === false,
            );
            return Object.fromEntries(entries);
          };
          const items = pr.items
            .filter(pr => pr.valid)
            .map(item => {
              return {
                start: toTimes(item.start),
                end: toTimes(item.end),
                info: toInfo(item),
              };
            });
          predictions.push({
            name: rs.name,
            text: rs.text,
            ...pr,
            items,
            conditions,
            operator,
          });
        }
      }
    }
    return res.status(HttpStatus.OK).json({
      longitudes,
      geo: result.geo,
      datetime: result.datetime,
      ayanamsha: result.ayanamsha,
      tz: 'UTC',
      predictions,
    });
  }

  /*
    #astrotesting
  */
  @Get('stars/:dt?/:nameRef?/:mode?')
  async allStars(
    @Res() res,
    @Param('dt') dt,
    @Param('nameRef') nameRef,
    @Param('mode') mode,
  ) {
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const funcMode = notEmptyString(mode) ? mode : '2ut';
    const nameList = notEmptyString(nameRef)
      ? nameRef.split(',').map(str => str.trim())
      : [];
    const data = await calcAllStars(dtUtc, nameList, funcMode);
    if (data.valid) {
      const { valid, stars, jd, sample } = data;
      const filteredStars = stars
        .filter(item => item.valid)
        .map(item => {
          return { star: item.star, ...item.result };
        });
      const num = stars.length;
      return res.json({
        valid,
        num,
        stars: filteredStars,
        sample,
        dt: dtUtc,
        jd,
      });
    } else {
      return res
        .status(HttpStatus.NOT_ACCEPTABLE)
        .json({ ...data, dt: dtUtc, jd });
    }
  }

  /*
    #astrotesting
  */
  @Get('all/:loc/:dt/:system?')
  async allByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('system') system,
  ) {
    let data: any = { valid: false, jd: -1, geo: {} };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data.geo = await this.geoService.fetchGeoAndTimezone(
        geo.lat,
        geo.lng,
        dt,
      );
      const dtUtc = applyTzOffsetToDateString(dt, data.geo.offset);
      const sysRef = notEmptyString(system) ? system : 'W';
      const bd = await calcBodiesInHouses(dtUtc, geo, sysRef);
      if (bd instanceof Object && bd.jd > 0) {
        data.valid = true;
        data.jd = bd.jd;
        data = { ...data, ...bd };
      }
      const vd = await calcVargas(dtUtc, geo, sysRef);

      const td = await calcAllTransitions(dtUtc, data.bodies);
      data.transitions = td.transitions;
      data.vargas = vd.vargas;
      const pd = await calcPanchanga(dtUtc, geo);
      data.yoga = pd.yoga;
      data.karana = pd.karana;
      data.vara = pd.vara;
      data.hora = pd.hora;
      data.caughadia = pd.caughadia;
      data.muhurta = { ...pd.muhurta, values: pd.muhurtaRange.values };
      const md = await calcMrityubhagaValues(data.bodies, data.ascendant);
      data.mrityubhaga = {
        standardRange: md.standardRange,
        altRange: md.altRange,
      };
      const ds = await calcSphutaData(dtUtc, geo);
      const entries = Object.entries(ds).filter(
        entry => !(entry[1] instanceof Object),
      );
      data.sphutas = Object.fromEntries(entries);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #astrotesting
  */
  @Get('compact/:loc/:dt/:ayanamshaMode?/:topList?/:suppress?/:simple?')
  async compactDataSet(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('ayanamshaMode') ayanamshaMode,
    @Param('topList') topList,
    @Param('suppress') suppress,
    @Param('simple') simple,
  ) {
    const fetchFull = smartCastInt(suppress, 0) < 1;
    const simplify = smartCastInt(simple, 0) > 0;
    const chartData = await this.fetchCompactChart(
      loc,
      dt,
      ayanamshaMode,
      topList,
      fetchFull,
    );
    const data = simplify
      ? simplifyChart(chartData, ayanamshaMode, 'complete', false, false)
      : chartData;
    return res.status(HttpStatus.OK).json(data);
  }

  /**
   * Fetch previously matched placenames and tz data if within 1km
   * Otherwise search new geo info
   * #mobile
   * #astrotesting
   */
  async fetchGeoInfo(geo = null, dt = '') {
    const placeMatches = await this.astrologicService.matchExistingPlaceNames(
      new GeoLoc(geo),
      4,
      1,
    );
    let geoInfo = { toponyms: [], tz: '', offset: 0 };
    let distance = 0;
    if (placeMatches.length > 0) {
      const geoPlace = placeMatches[0];
      const tzOffset = this.geoService.checkLocaleOffset(
        geoPlace.tz,
        dt,
        geoPlace.placenames,
      );
      distance = geoPlace.distance;
      geoInfo = {
        toponyms: geoPlace.placenames,
        tz: geoPlace.tz,
        offset: tzOffset,
      };
    } else {
      geoInfo = await this.geoService.fetchGeoAndTimezone(geo.lat, geo.lng, dt);
    }
    return { ...geoInfo, distance };
  }

  /*
    #astrotesting
    #mobile
  */
  async fetchCompactChart(
    loc: string,
    dt: string,
    ayanamshaMode = 'true_citra',
    topList = '',
    fetchFull = true,
    addExtraSets = true,
  ) {
    let data: any = { valid: false };
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const geoInfo = await this.fetchGeoInfo(geo, dt);
      const dtUtc = applyTzOffsetToDateString(dt, geoInfo.offset);

      const ayanamshaKey = notEmptyString(ayanamshaMode, 3)
        ? ayanamshaMode.toLowerCase().replace(/-/g, '_')
        : '';
      const topMode = ayanamshaKey === 'top';
      const topKeys =
        topMode && notEmptyString(topList, 5) ? topList.split(',') : [];
      data = await calcCompactChartData(
        dtUtc,
        geo,
        ayanamshaKey,
        topKeys,
        geoInfo.offset,
        fetchFull,
        addExtraSets,
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

  /*
    #mobile
    #astrotesting
  */
  @Get('current-chart/:loc/:dt?/:mode?')
  async fetchCurrent(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('mode') mode,
    @Query() query,
  ) {
    const dtUtc = validISODateString(dt) ? dt : currentISODate();
    const simplify = mode !== 'all';
    const queryKeys = query instanceof Object ? Object.keys(query) : [];
    const ayanamshaKey = notEmptyString(mode, 5)
      ? mode
      : simplify
      ? 'true_citra'
      : 'top';
    const topList = !simplify ? 'top' : ayanamshaKey;
    const fetchFull = mode === 'all';
    const data = await this.fetchCompactChart(
      loc,
      dtUtc,
      'top',
      topList,
      fetchFull,
      fetchFull,
    );
    const chart = simplify ? simplifyAstroChart(data, true, true) : data;
    if (chart instanceof Object) {
      const vakraScale = queryKeys.includes('vakra')
        ? smartCastInt(query.vakra, 60)
        : 60;
      chart.numValues = await this.astrologicService.calcExtraScoresForChart(
        data,
        vakraScale,
      );
    }
    return res.json(chart);
  }

  @Get('compare-chart')
  async compareWithChart(@Res() res, @Query() query) {
    const keys = query instanceof Object ? Object.keys(query) : [];
    const loc = keys.includes('loc') ? query.loc : '0,0';
    //const geo = locStringToGeo(loc);
    const userID =
      keys.includes('user') && isValidObjectId(query.user) ? query.user : '';
    const roddenValue =
      keys.includes('rodden') && isNumeric(query.rodden)
        ? smartCastInt(query.rodden)
        : 200;
    const refDt =
      keys.includes('dt') && validISODateString(query.dt)
        ? query.dt
        : currentISODate();
    //const geoInfo = await this.fetchGeoInfo(geo, refDt);
    const gender = keys.includes('gender') ? query.gender : '';
    const name = keys.includes('name') ? query.name : 'N/A';
    const saveChart = keys.includes('save') && smartCastInt(query.save, 0) > 0;
    const pob =
      keys.includes('pob') && notEmptyString(query.pob, 1) ? query.pob : '';
    const updateChart =
      saveChart && keys.includes('cid') && isValidObjectId(query.cid);
    const showUserChart = keys.includes('uc')
      ? smartCastInt(query.uc, 0) > 0
      : false;
    const showP2 = keys.includes('p2') ? smartCastInt(query.p2, 0) > 0 : false;
    //const dtUtc = applyTzOffsetToDateString(refDt, geoInfo.offset);
    // refDT in local time will be converted to UTC
    const data = await this.fetchCompactChart(
      loc,
      refDt,
      'top',
      'true_citra',
      false,
      false,
    );
    data.isDefaultBirthChart = false;
    data.subject = {
      name,
      gender,
      notes: pob,
      type: 'person',
      eventType: 'birth',
      roddenValue,
    };

    data.progressItems = showP2
      ? await buildSingleProgressSetKeyValues(data.jd)
      : [];
    const c2 = new Chart(data);
    let saved = false;
    c2.setAyanamshaItemByKey('true_citra');
    if (saveChart) {
      data.user = userID;
      data.placenames = data.placenames.map(p => {
        const { name, fullName, type, lat, lng } = p;
        return { name, fullName, type, geo: { lat, lng } };
      });
      let record = null;
      const cDto = data as CreateChartDTO;
      if (updateChart) {
        record = await this.astrologicService.updateChart(query.cid, cDto);
      } else {
        record = await this.astrologicService.createChart(cDto);
      }
      if (record instanceof Model) {
        if (record._id) {
          data._id = record._id;
          saved = true;
        }
      }
    }
    const otherChart = simplifyAstroChart(data, true, true);
    addExtraPanchangaNumValuesFromClass(data, c2, 'true_citra');
    let userChart = null;
    let c1 = new Chart();
    const userStatus = await this.userService.memberActive(userID);
    let status = userStatus.status;
    const acceptable = notEmptyString(userID, 16);
    if (!acceptable) {
      status = HttpStatus.NOT_ACCEPTABLE;
    }
    if (acceptable && userStatus.active) {
      if (userStatus.active) {
        const chartRecord = await this.astrologicService.getUserBirthChart(
          userID,
        );
        if (chartRecord instanceof Model) {
          const chartData = chartRecord.toObject();
          c1 = new Chart(chartData);
          userChart = simplifyAstroChart(chartData, true, true);
          addExtraPanchangaNumValuesFromClass(chartData, c1, 'true_citra');
        }
      }
    }
    const hasUserChart = userChart instanceof Object;
    if (hasUserChart) {
      const kutaDict = await this.dictionaryService.getKutaDict();
      const customSettings = await this.settingService.customCompatibilitySettings(
        kutaDict,
      );
      const compatibility = this.astrologicService.compareCharts(
        c1,
        c2,
        customSettings,
      );
      const nickName = name;
      const result = showUserChart
        ? {
            valid: true,
            key: userStatus.key,
            saved,
            nickName,
            pob,
            ...compatibility,
            otherChart,
            userChart,
          }
        : {
            valid: true,
            key: userStatus.key,
            saved,
            nickName,
            pob,
            ...compatibility,
            chart: otherChart,
          };
      return res.status(status).json(result);
    } else {
      return res.status(status).json({ valid: false, key: userStatus.key });
    }
  }

  /*
    #mobile
    #astrotesting
  */
  @Get('snapshot/:loc/:dt?/:mode?')
  async fetchShapshot(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('mode') mode,
  ) {
    const dtUtc = validISODateString(dt) ? dt : currentISODate();
    const simplify = mode !== 'all';
    const ayanamshaKey = notEmptyString(mode, 5)
      ? mode
      : simplify
      ? 'true_citra'
      : 'top';
    const data = await this.astrologicService.getChartSnapshot(
      dtUtc,
      ayanamshaKey,
    );
    const chart = simplify ? simplifyAstroChart(data, false, false) : data;
    const ayaRow = chart.ayanamshas.find(r => r.key === ayanamshaKey);
    const ayanamshaVal = ayaRow instanceof Object ? ayaRow.value : 0;
    const geo = locStringToGeo(loc);
    const jd = calcJulDate(dtUtc);
    const asc = calcOffsetAscendant(geo.lat, geo.lng, jd, ayanamshaVal);
    const adjusted = applyAscendantToSimpleChart(chart, geo, ayanamshaKey);
    return res.json({ chart: adjusted, asc });
  }

  /*
    #mobile
    #astrotesting
  */
  @Get('existing-placenames/:loc/:maxDistance?')
  async fetchPlacenames(
    @Res() res,
    @Param('loc') loc,
    @Param('maxDistance') maxDistance,
  ) {
    const latLngAlt = locStringToGeo(loc);
    const maxDistanceInt = smartCastInt(maxDistance, 3);
    const geo = new GeoLoc(latLngAlt);
    const data = await this.astrologicService.matchExistingPlaceNames(
      geo,
      maxDistanceInt,
    );
    return res.json(data);
  }

  /*
    #mobile
    #astrotesting
  */
  @Post('save-user-chart')
  async saveUserChart(@Res() res, @Body() inData: ChartInputDTO) {
    const { _id } = inData;
    const chartID = notEmptyString(_id, 12) ? _id : '';
    const status = notEmptyString(inData.status) ? inData.status : 'user';
    const data = await this.saveChartData({ ...inData, status }, true, chartID);
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #mobile
  */
  @Post('save-member-chart/:ayanamsha?/:mode?')
  async saveUserChartSimple(
    @Res() res,
    @Body() inData: ChartInputDTO,
    @Param('mode') mode: string,
    @Param('ayanamsha') ayanamsha: string,
  ) {
    const { _id } = inData;
    const chartID = notEmptyString(_id, 12) ? _id : '';
    // basic | simple | complete
    const ayaKey = notEmptyString(ayanamsha, 5) ? ayanamsha : 'true_citra';
    const simpleMode = notEmptyString(mode, 3) ? mode : 'basic';
    const userStatus = await this.userService.memberActive(inData.user);
    let data: any = { valid: false, shortTz: '' };
    if (userStatus.active) {
      data = await this.saveChartData(
        { ...inData, status: 'member' },
        true,
        chartID,
        'true_citra',
        false,
      );
    }
    const { valid, shortTz } = data;
    const chart = valid ? simplifyChart(data.chart, ayaKey, simpleMode) : {};
    // only add calculated moonNak and vara if valid object returned and ayaKey is true_citra
    if (valid && ayaKey === 'true_citra') {
      addExtraPanchangaNumValues(data.chart, ayaKey);
    }
    if (userStatus.active && !valid) {
      userStatus.status = HttpStatus.NOT_ACCEPTABLE;
    }
    return res
      .status(userStatus.status)
      .json({ valid, shortTz, chart, key: userStatus.key });
  }

  /*
    #mobile
    #astrotesting
  */
  @Get('save-user-birth-chart/:userID/:loc/:dt/:g')
  async saveUserBirthChart(
    @Res() res,
    @Param('userID') userID: string,
    @Param('loc') loc: string,
    @Param('dt') dt: string,
    @Param('g') g: string,
  ) {
    let data: any = { valid: false };
    const user = await this.userService.getUser(userID);
    const geo = locStringToGeo(loc);
    const gender = notEmptyString(g) && g.length === 1 ? g : 'n';
    if (user instanceof Object) {
      const inData = {
        user: user._id,
        name: user.nickName,
        datetime: dt,
        lat: geo.lat,
        lng: geo.lng,
        alt: geo.alt,
        notes: '',
        type: 'person',
        isDefaultBirthChart: true,
        gender,
        eventType: 'birth',
        roddenValue: 100,
      } as ChartInputDTO;
      data = await this.saveChartData(inData);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #astrotesting
  */
  @Get('save-test-users-birth-chart/:start?/:limit?')
  async saveTestUsersBirthChart(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const users = await this.userService.list(
      startInt,
      limitInt,
      { test: true },
      true,
    );
    const chartIds = [];
    const numUsers = users.length;
    const valid = numUsers > 0;
    for (const user of users) {
      if (user instanceof Object) {
        const geo = user.geo;
        if (user.dob) {
          const inData = {
            user: user._id,
            name: user.nickName,
            datetime: user.dob
              .toISOString()
              .split('.')
              .shift(),
            lat: geo.lat,
            lng: geo.lng,
            alt: geo.alt,
            notes: '',
            type: 'person',
            status: 'test',
            isDefaultBirthChart: true,
            gender: user.gender,
            eventType: 'birth',
            roddenValue: 100,
          } as ChartInputDTO;
          const saved = await this.saveChartData(
            inData,
            true,
            '',
            'true_citra',
            false,
          );
          if (saved.valid) {
            chartIds.push({
              _id: saved.chart._id,
              uid: user._id,
              name: user.nickName,
            });
          }
        }
      }
    }
    const num = chartIds.length;
    return res.json({ chartIds, num, valid });
  }

  /*
    #astrotesting
    #mobile
  */
  async saveChartData(
    inData: ChartInputDTO,
    save = true,
    chartID = '',
    ayanamsha = 'top',
    fetchFull = true,
  ) {
    const data: any = {
      valid: false,
      message: '',
      chart: null,
      hasGeoTzData: false,
    };
    const {
      user,
      datetime,
      lat,
      lng,
      alt,
      isDefaultBirthChart,
      locality,
      pob,
      notes,
      tz,
      tzOffset,
      placenames,
      parent,
      status,
    } = inData;
    let { name, type, gender, eventType, roddenValue } = inData;
    const userRecord = await this.userService.getUser(user);
    // If user record is matched, proceed

    if (userRecord instanceof Object) {
      const dob =
        userRecord.dob instanceof Date ? utcDate(userRecord.dob) : null;
      const dobDtStr = dob instanceof Object ? dob.toISOString() : '';
      const hasValidDatetime = validISODateString(datetime);
      const useDob = !hasValidDatetime && validISODateString(dobDtStr);
      const refDt = useDob ? dobDtStr : datetime;
      if (userRecord.active) {
        if (validISODateString(refDt) && isNumeric(lat) && isNumeric(lng)) {
          const geo = { lat, lng, alt };
          if (isDefaultBirthChart) {
            name = userRecord.nickName;
            type = 'person';
            eventType = 'birth';
            if (notEmptyString(userRecord.gender, 1)) {
              gender = userRecord.gender;
            }
            if (typeof roddenValue !== 'number') {
              roddenValue = 10000;
            }
          }
          const subject = {
            name,
            type,
            gender,
            eventType,
            roddenValue,
            notes,
          };
          data.hasGeoTzData =
            notEmptyString(tz) &&
            isNumeric(tzOffset) &&
            placenames instanceof Array &&
            placenames.length > 1;
          const geoInfo = await this.fetchGeoInfo(geo, refDt);
          const dtUtc = applyTzOffsetToDateString(refDt, geoInfo.offset);
          const topKeys = !fetchFull && ayanamsha !== 'top' ? [ayanamsha] : [];
          // always fetch chart data with tropical grahas, but apply ayanamsha(s)
          // for derived value sets. For member charts only fetch one set of ayanamsha variants
          // as the others will never be used and
          // tropical values can easily be adjusted by known ayanamsha offsets
          const chartData = await calcCompactChartData(
            dtUtc,
            geo,
            'top',
            topKeys,
            geoInfo.offset,
            fetchFull,
          );
          if (chartData instanceof Object) {
            const localityRef = notEmptyString(locality)
              ? locality
              : notEmptyString(pob, 4)
              ? pob.split(',').shift()
              : '';
            const placenames = mapGeoPlacenames(
              geoInfo.toponyms,
              geo,
              localityRef,
            );
            const pobRef = notEmptyString(pob, 4)
              ? pob
              : extractCorePlaceNames(placenames);
            data.shortTz = toShortTzAbbr(dtUtc, geoInfo.tz);
            // Update DOB field in the user table
            if (isDefaultBirthChart) {
              const userMap: Map<string, any> = new Map();
              if (hasValidDatetime) {
                userMap.set('dob', utcDate(datetime));
              }
              if (notEmptyString(pobRef, 3)) {
                userMap.set('pob', pobRef);
              }
              if (userMap.size > 0) {
                const userData = Object.fromEntries(
                  userMap.entries(),
                ) as CreateUserDTO;
                this.userService.updateUser(user, userData);
              }
            }
            const progressItems = await buildSingleProgressSetKeyValues(
              chartData.jd,
            );
            data.chart = {
              user,
              isDefaultBirthChart,
              subject,
              tz: geoInfo.tz,
              tzOffset: geoInfo.offset,
              placenames,
              status,
              ...chartData,
              progressItems,
            };
            if (notEmptyString(parent, 16)) {
              data.chart.parent = parent;
            } else {
              // remove parent Object ID ref altogether
              data.chart.parent = null;
            }
            let saved = null;
            // User must be active
            if (save) {
              if (notEmptyString(chartID, 8)) {
                saved = await this.astrologicService.updateChart(
                  chartID,
                  data.chart,
                );
              } else {
                saved = await this.astrologicService.createChart(data.chart);
              }
            }
            if (saved instanceof Object) {
              const { _id } = saved;
              const strId = _id instanceof Object ? _id.toString() : _id;
              if (notEmptyString(strId, 8)) {
                data.chart = {
                  _id: strId,
                  ...data.chart,
                };
                data.valid = true;
              }
            }
          } else {
            data.message = 'Invalid input values';
          }
        } else {
          data.message = 'Invalid date, time, latitude or longitude';
        }
      } else {
        data.message = 'User account is inactive';
      }
    } else {
      data.message = 'User account cannot be verified';
    }
    return data;
  }

  /**
   * Fetch a full set of dashas to given level. PLease note this can be slow beyond the 3rd level (pratyantardasha)
   *
   */
  @Get('dasha-set')
  async fetchDashSet(@Res() res, @Query() query) {
    const {
      dt,
      transitJd,
      system,
      key,
      chartData,
      maxLevel,
      durDays,
    } = await this.matchDashaQueryParams(query);
    const data = { dashas: [], nak: -1, lng: -1 };
    if (chartData instanceof Object) {
      const chart = new Chart(chartData);
      const { dashas, nak, lng } = matchDashaSubsetFromChart(
        chart,
        transitJd,
        maxLevel,
        durDays,
        key,
        system,
      );
      if (dashas instanceof Array) {
        data.dashas = dashas;
        data.nak = nak;
        data.lng = lng;
      }
    }
    return res.json({ ...data, dt });
  }

  async matchDashaQueryParams(query) {
    const hasQuery = query instanceof Object && Object.keys(query).length > 1;
    const criteria: Map<string, string> = hasQuery
      ? new Map(Object.entries(query))
      : new Map();
    const dt = criteria.has('dt') ? criteria.get('dt') : '';
    const hasDt = validISODateString(dt);
    const hasLoc = criteria.has('loc');
    const hasLatLng = criteria.has('lat') && criteria.has('lng');
    const geo = hasLoc
      ? locStringToGeo(criteria.get('loc'))
      : hasLatLng
      ? latLngParamsToGeo(
          criteria.get('lat'),
          criteria.get('lng'),
          criteria.get('alt'),
        )
      : { lat: 0, lng: 0, alt: 0 };
    let levelInt = criteria.has('level')
      ? smartCastInt(criteria.get('level'), 4)
      : 4;
    const transitDt = criteria.has('transit')
      ? criteria.get('transit')
      : criteria.has('after')
      ? criteria.get('after')
      : '';
    const hasTransitDt = validISODateString(transitDt);
    const transitJd = hasTransitDt ? calcJulDate(transitDt) : -1;
    const system = criteria.has('system')
      ? criteria.get('system')
      : 'vimshottari';
    const key = criteria.has('key') ? criteria.get('key') : 'mo';
    const chartId = criteria.has('chart') ? criteria.get('chart') : '';
    const userId = criteria.has('user') ? criteria.get('user') : '';
    const hasChartId = notEmptyString(chartId, 16);
    const hasUserId = notEmptyString(userId, 16);
    const validRefs = hasDt && (hasLoc || hasLatLng);
    const balanceRef = new DashaBalance(criteria);
    const duration = criteria.has('duration') ? criteria.get('duration') : '';
    const durDays = notEmptyString(duration)
      ? durationStringToDays(duration)
      : 30;
    if (balanceRef.maxLevel > 0) {
      levelInt = balanceRef.maxLevel;
    }
    let chartData: any = null;
    if (hasChartId || hasUserId) {
      const chartModel = hasUserId
        ? await this.astrologicService.getUserBirthChart(userId)
        : await this.astrologicService.getChart(chartId);
      if (chartModel instanceof Model) {
        chartData = chartModel.toObject();
      }
    } else if (validRefs) {
      chartData = await calcCompactChartData(
        dt,
        geo,
        'top',
        ['true_citra'],
        0,
        false,
        false,
      );
    }
    return {
      dt,
      transitJd,
      chartId,
      userId,
      system,
      key,
      maxLevel: levelInt,
      chartData,
      balanceRef,
      durDays,
    };
  }

  /*
   * Fetch the dasha balance for a given date or when the mahadasha, antardasha or priantarddasha
   * next match specified graha keys
   * All named parameters are added to the query string
   * Charts may identified by chart id (chart=[chartID]), user if (user=[userID]) or by location + datetime time (&loc=65.15,-13.4&dt=1967-08-23:04:09:34) or (&lat=65.15&lng-13.4&dt=1967-08-23:04:09:34)
   * The default system is vimshottari, but other systems may be specified with the system parameter
   * The default base graha is the mmon, but other grahas may be specified with key and a two letter code (key=ma)
   * If no target dasha grahas are specified, we need a reference transit date with transit=2021-07-18T12:00:00
   * The level parameter determines the maximum depth
   * To find the occurrence of a given dasha graha after a given date, use the lv1, lv2, lv3 and lv4 parameters
   * in combination with either transit or after, (lv2=ma&after=2021-06-30T00:00:00). The maximum depth is the highest level specified
   */
  @Get('dasha-balance')
  async getDashBalance(@Res() res, @Query() query) {
    const {
      dt,
      transitJd,
      system,
      key,
      chartData,
      balanceRef,
      maxLevel,
    } = await this.matchDashaQueryParams(query);
    const data: any = {};
    let nak = -1;
    let lng = -1;
    let balances = [];
    if (chartData instanceof Object) {
      const chart = new Chart(chartData);
      nak = chart.graha(key).nakshatra27;
      lng = chart.graha(key).longitude;
      balances = assignDashaBalances(
        chart,
        transitJd,
        maxLevel,
        balanceRef,
        system,
        key,
      );
    }
    return res.json({
      dt,
      balances,
      nak,
      lng,
      yearLength: data.yearLength,
      system,
      key,
    });
  }

  @Get('next-ascendant/:lng/:loc/:dt?')
  async fetchNextAscendant(
    @Res() res,
    @Param('lng') lng,
    @Param('loc') loc,
    @Param('dt') dt,
  ) {
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const geo = locStringToGeo(loc);
    const lngFl = smartCastFloat(lng, 0);
    const data = await calcNextAscendantLng(
      lngFl,
      geo.lat,
      geo.lng,
      jd,
      'true_citra',
    );
    return res.json({ ...data, dtUtc });
  }

  /**
   * #astrotesting
   */
  @Get('transpose-chart')
  async transposeChart(@Res() res, @Query() query) {
    const params = query instanceof Object ? query : {};
    const keys = Object.keys(params);
    const dt = keys.includes('dt') ? params.dt : '';
    const loc = keys.includes('loc') ? params.loc : '';
    const hasLoc = validLocationParameter(loc);
    const hasChartId =
      keys.includes('chart') && notEmptyString(params.chart, 16);
    const hasBirthLoc =
      keys.includes('bloc') && validLocationParameter(params.bloc);
    const hasBirthDt = keys.includes('bdt') && validISODateString(params.bdt);
    const sameLocTime =
      hasLoc && keys.includes('auto') && smartCastInt(params.auto, 0) > 0;

    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const chartId = hasChartId ? params.chart : '';
    const useGeneratedChart = hasBirthDt && hasBirthLoc && !hasChartId;
    const loadCustom = useGeneratedChart || sameLocTime;

    const result = {
      valid: false,
      message: '',
      dt: dtUtc,
      jd,
      birthJd: 0,
      birthDt: '',
      geo: { lat: 0, lng: 0 },
      birthGeo: { lat: 0, lng: 0 },
      items: [],
      chart: null,
    };
    let cData = null;
    if (hasChartId) {
      cData = await this.astrologicService.getChart(chartId);
      if (!cData) {
        result.message = 'Cannot match the chart ID';
      }
    } else if (loadCustom) {
      const cLoc = sameLocTime ? loc : params.bloc;
      const cDt = sameLocTime ? dtUtc : params.btd;
      const geo = locStringToGeo(cLoc);
      cData = await calcCompactChartData(cDt, geo, 'true_citra', [], 0, true);
      if (!cData) {
        result.message = `Invalid birth location and/or date parameters "bloc" and "bdt"`;
      }
    }
    if (cData instanceof Object) {
      const cObj = cData instanceof Model ? cData.toObject() : cData;
      const chart = new Chart(cObj);
      chart.setAyanamshaItemByKey('true_citra');
      result.birthJd = chart.jd;
      const hasTransitGeo = validLocationParameter(loc);
      const geo = hasTransitGeo ? locStringToGeo(loc) : chart.geo;
      result.chart = chart;
      result.valid = true;
      result.geo = hasTransitGeo ? geo : chart.geo;
      if (chart.grahas.length > 0) {
        result.birthGeo = chart.geo;
        result.birthDt = julToISODate(chart.jd)
          .split('.')
          .shift();
        const sourceTransitions = chart.getTransitions();
        for (const gr of chart.bodies) {
          const dV = await calcDeclination(chart.jd, gr.num);
          const altitude = await calcAltitudeSE(
            jd,
            chart.geo,
            gr.longitude,
            gr.lat,
            false,
          );
          const approxTimes = approxTransitTimes(geo, 0, jd, dV.ra, dV.value);
          const cTransItem = sourceTransitions.find(tr => tr.key === gr.key);
          const hasCTrans =
            cTransItem instanceof Object &&
            Object.keys(cTransItem).includes('rise');
          const sourceEntries = hasCTrans
            ? Object.entries(cTransItem)
                .filter(entry => ['rise', 'set', 'mc', 'ic'].includes(entry[0]))
                .map(([k, v]) => {
                  const { jd } = v;
                  return [k, { jd, dt: julToISODate(jd) }];
                })
            : [];
          const source = Object.fromEntries(sourceEntries);
          const sourceKeys = sourceEntries.map(entry => entry[0]);

          const entries = Object.entries(approxTimes).map(([k, v]) => {
            const item = {
              jd: v,
              dt: julToISODate(v),
              bJd: sourceKeys.includes(k) ? source[k].jd : 0,
              bDt: sourceKeys.includes(k) ? source[k].dt : '',
            };
            return [k, item];
          });
          const transSet = Object.fromEntries(entries);
          result.items.push({
            key: gr.key,
            ...dV,
            ...transSet,
            altitude,
            longitude: gr.longitude,
            tropLng: gr.lng,
          });
        }
      }
    } else {
      if (result.message.length < 3) {
        result.message = 'Invalid parameters';
      }
    }
    return res.json({ ...result, chartId });
  }

  /*
   * #astrotesting
   * fetch altitude of any point in the sky at a given location
   * Can be used to calculate transits
   */
  @Get('altitude/:loc/:dt/:lng/:lat/:equal?')
  async matchAltitude(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('lng') lng,
    @Param('lat') lat,
    @Param('equal') equal,
  ) {
    const { jd, dtUtc } = matchJdAndDatetime(dt);
    const geo = locStringToGeo(loc);
    const flLng = smartCastFloat(lng);
    const flLat = smartCastFloat(lat);
    const isEqual = smartCastInt(equal) > 0;
    const { altitude, azimuth } = await calcAltitudeResult(
      jd,
      geo,
      flLng,
      flLat,
      isEqual,
    );
    return res.json({
      altitude,
      azimuth,
      lng: flLng,
      lat: flLat,
      geo,
      jd,
      dtUtc,
    });
  }

  /*
   * #astrotesting
   * fetch equatorial position including the declination
   * Can be used to calculate transits
   */
  @Get('declination/:key/:dt')
  async calcEqPoistion(@Res() res, @Param('key') key, @Param('dt') dt) {
    const { jd, dtUtc } = matchJdAndDatetime(dt);
    const grNum = matchPlanetNum(key);
    const dV = await calcDeclination(jd, grNum);
    return res.json({ ...dV, dtUtc });
  }

  @Get('noon-jd/:loc/:dt?')
  async fetchNoonJd(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    const geo = locStringToGeo(loc);
    const result = matchLocaleJulianDayData(dt, geo);
    return res.json(result);
  }

  /*
  #astrotesting
  check rules sets
  */
  @Get('day-transits')
  async dayTransits(@Res() res, @Query() query) {
    const params = query instanceof Object ? query : {};
    const keys = Object.keys(params);
    const dt = keys.includes('dt') ? params.dt : '';
    const loc = keys.includes('loc') ? params.loc : '';
    const grahaKey = keys.includes('gr') ? params.gr : '';
    const hasGrahaKey = grahaKey.length === 2;
    const planetNum = hasGrahaKey ? matchPlanetNum(grahaKey) : -1;
    const fromCurrentGraha = planetNum >= 0;
    const hasLoc = validLocationParameter(loc);
    const topoMode = keys.includes('topo')
      ? smartCastInt(params.topo) === 1
      : false;
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const geo = locStringToGeo(loc);
    let seTransits = [];
    let hasLngLat = false;
    let lng = 0;
    let lat = 0;
    let lngSpeed = 0;
    if (fromCurrentGraha) {
      const result = await calcTransitionJd(
        jd,
        geo,
        planetNum,
        true,
        true,
        true,
      );
      const adjustMode = keys.includes('adjust') ? params.adjust : '';
      const useRefSpeed = adjustMode === 'spd';
      if (result.valid) {
        seTransits = ['rise', 'set', 'mc', 'ic'].map(k => {
          const item = result[k];
          return {
            type: k,
            lng: item.lng,
            jd: item.jd,
            dt: julToISODate(item.jd),
          };
        });
        const body = await calcBodyJd(jd, grahaKey, false, topoMode);
        switch (adjustMode) {
          case 'rise':
            lng = result.rise.lng;
            break;
          case 'set':
            lng = result.set.lng;
          case 'mc':
            lng = result.mc.lng;
            break;
          default:
            lng = body.lng;
            break;
        }

        lat = body.lat;
        if (useRefSpeed) {
          lngSpeed = body.lngSpeed;
        }
        hasLngLat = true;
      }
    }
    if (!hasLngLat) {
      lng = keys.includes('lng') ? smartCastInt(params.lng, 0) : 0;
      lat = keys.includes('lat') ? smartCastInt(params.lat, 0) : 0;
      lngSpeed = keys.includes('speed') ? smartCastInt(params.lat, 0) : 0;
    }
    const mins = keys.includes('mins') ? smartCastInt(params.mins, 1) : 0;
    const multiplier = mins > 0 ? mins : grahaKey === 'mo' ? 1 : 5;
    const filterStr = keys.includes('types')
      ? notEmptyString(params.types, 1)
        ? params.types
        : ''
      : '';
    const filterKeys = filterStr.length > 1 ? filterStr.split(',') : [];
    const sampleKey = grahaKey === 'mo' ? grahaKey : '';
    const data = hasLoc
      ? await calcTransposedObjectTransitionsSimple(
          jd,
          geo,
          lng,
          lat,
          lngSpeed,
          multiplier,
          filterKeys,
          sampleKey,
        )
      : [];
    return res.json({
      jd,
      dtUtc,
      lat,
      lng,
      lngSpeed,
      grahaKey,
      multiplier,
      seTransits,
      ...data,
    });
  }

  /*
  #astrotesting
  check rules sets
  */
  @Get('predictive-rule-check/:ruleID/:chartID/:loc?')
  async checkRulesetForChart(
    @Res() res,
    @Param('ruleID') ruleID,
    @Param('chartID') chartID,
    @Param('loc') loc,
  ) {
    const ruleData = await this.settingService.getRuleSet(ruleID);
    const result = { valid: false, matches: false, items: [] };
    const hasRuleData = ruleData instanceof Model;
    const chartRecord = await this.astrologicService.getChart(chartID);
    const hasChart = chartRecord instanceof Model;
    if (hasChart && hasRuleData) {
      const chartData = hasChart ? chartRecord.toObject() : {};
      const chart = new Chart(chartData);
      const geo = isLocationString(loc) ? locStringToGeo(loc) : chart.geo;
      const data = await this.fetchPredictions(ruleData, chart, geo);
      if (data.valid) {
        result.valid = data.items.length > 0;
        result.matches = data.matches;
        result.items = data.items;
      }
    }
    return res.json(result);
  }

  async fetchPredictions(ruleData = null, chart: Chart, geo: GeoPos) {
    const rule = new PredictiveRule(ruleData);
    const settings = await this.settingService.getProtocolSettings();

    const andMode = rule.conditionSet.operator !== 'or';
    const outerConditions = rule.conditionSet.conditionRefs.filter(
      cr => !cr.isSet,
    );
    const outerItems = [];
    const isPP = rule.type === 'panchapakshi';
    if (isPP) {
      const items = await matchPanchaPakshiOptions(ruleData, chart, geo);
      for (const item of items) {
        outerItems.push(item);
      }
    } else {
      for (const cond of outerConditions) {
        if (cond instanceof Condition) {
          const newOuterItem = await processPredictiveRuleSet(
            cond,
            rule.type,
            chart,
            geo,
            settings,
          );
          outerItems.push(newOuterItem);
        }
      }
    }

    const valid = chart.grahas.length > 6;
    const numOuterValid = outerItems.filter(oi => oi.valid).length;
    const matches = isPP
      ? outerItems.length > 0
      : andMode
      ? numOuterValid === outerItems.length
      : numOuterValid > 0;
    return { valid, matches, items: outerItems };
  }

  @Get('life-events/:chartID')
  async getRelated(@Res() res, @Param('chartID') chartID) {
    const criteria: Map<string, any> = new Map();
    const validId = isValidObjectId(chartID) && /^[0-9a-f]+$/i.test(chartID);
    criteria.set('$or', [{ _id: chartID }, { parent: chartID }]);
    const items = validId
      ? await this.astrologicService.relatedChartSubjects(chartID)
      : [];
    const num = items.length;
    return res.json({
      valid: num > 0,
      num,
      items,
    });
  }

  @Get('core-values/:ayanamsha?/:start?/:limit?')
  async getCoreValues(
    @Res() res,
    @Param('ayanamsha') ayanamsha,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const ayanamshaKey = notEmptyString(ayanamsha, 4)
      ? ayanamsha.replace(/-+/g, '_')
      : 'true_citra';
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const items = await this.astrologicService.getCoreAdjustedValues(
      ayanamshaKey,
      startInt,
      limitInt,
    );
    return res.send(items);
  }

  @Post('aspect-match')
  async getByAspectRanges(@Res() res, @Body() inData: AspectSetDTO) {
    let resultItems: Array<any>;
    const items: Array<AspectSet> = [];
    if (inData instanceof Object) {
      const hasProtocolID = notEmptyString(inData.protocolID, 12);
      const isAuto = inData.protocolID === 'auto';
      const hasOverride = hasProtocolID || isAuto;
      const protocolRef = hasOverride ? inData.protocolID : '';
      for (const aspSet of inData.items) {
        const orbRef = hasOverride ? protocolRef : aspSet.orb;
        const orb = await this.matchOrb(
          aspSet.key,
          aspSet.k1,
          aspSet.k2,
          orbRef,
        );
        items.push({
          key: aspSet.key,
          k1: aspSet.k1,
          k2: aspSet.k2,
          orb,
        });
      }
      const start = isNumber(inData.start) ? inData.start : 0;
      const limit = isNumber(inData.limit) ? inData.limit : 100;
      const data = await this.astrologicService.filterPairedByAspectSets(
        items,
        start,
        limit,
      );

      const results = await this.astrologicService.getPairedByIds(
        data.map(row => row._id),
        limit,
      );
      resultItems = results.map(item => {
        const row = data.find(row => row._id === item._id);
        const diff = row instanceof Object ? row.diff : 0;
        return {
          ...item,
          diff,
        };
      });
    }
    return res.status(200).send({
      valid: resultItems.length > 0,
      items: resultItems,
      input: items,
    });
  }

  @Get('aspect-match/:aspect/:k1/:k2/:orb?/:max?')
  async getByAspectRange(
    @Res() res,
    @Param('aspect') aspect,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('orb') orb,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 1000);
    const orbDouble = await this.matchOrb(aspect, k1, k2, orb);

    const data = await this.astrologicService.filterPairedByAspect(
      aspect,
      k1,
      k2,
      orbDouble,
    );
    const num = data instanceof Array ? data.length : 0;
    const results =
      num > 0
        ? await this.astrologicService.getPairedByIds(
            data.map(row => row._id),
            maxInt,
          )
        : [];
    return res.status(200).send({
      valid: results.length > 0,
      orb: orbDouble,
      num,
      aspect,
      numResults: results.length,
      results,
    });
  }

  @Get('aspect-match-count/:aspect/:k1/:k2/:orb?/:max?')
  async countByAspectRange(
    @Res() res,
    @Param('aspect') aspect,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('orb') orb,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);
    const orbDouble = await this.matchOrb(aspect, k1, k2, orb);
    const data = await this.astrologicService.filterPairedByAspect(
      aspect,
      k1,
      k2,
      orbDouble,
      maxInt,
    );
    return res.status(200).send({
      valid: data.length > 0,
      orb: orbDouble,
      aspect,
      num: data.length,
    });
  }

  @Get(
    'discover-aspect-matches/:aspect/:k1/:k2/:sourceLng/:orb?/:ayanamshaKey?/:max?',
  )
  async discoverAspectMatches(
    @Res() res,
    @Param('aspect') aspect,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('sourceLng') sourceLng,
    @Param('orb') orb,
    @Param('ayanamshaKey') ayanamshaKey,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);
    const orbDouble = await this.matchOrb(aspect, k1, k2, orb);
    const aKey = notEmptyString(ayanamshaKey, 3) ? ayanamshaKey : 'true_citra';
    const items = await this.astrologicService.findAspectMatch(
      k1,
      k2,
      sourceLng,
      aspect,
      orbDouble,
      aKey,
    );
    return res.status(200).send({
      num: items.length,
      items,
      maxInt,
    });
  }

  /*
    Discover charts with a planet within specified degree range
  */
  @Get('discover-degree-range-matches/:key/:lng/:orb?/:ayanamshaKey?/:max?')
  async discoverDegreeRangeMatches(
    @Res() res,
    @Param('key') key,
    @Param('lng') lng,
    @Param('orb') orb,
    @Param('ayanamshaKey') ayanamshaKey,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);
    const lngs = notEmptyString(lng)
      ? lng
          .split(',')
          .filter(lng => isNumeric(lng))
          .map(parseFloat)
      : [];
    const aKey = notEmptyString(ayanamshaKey, 3) ? ayanamshaKey : 'true_citra';
    const orbDouble = isNumeric(orb) ? parseFloat(orb) : 1;
    const items = await this.astrologicService.findPredictiveRangeMatch(
      key,
      lngs,
      orbDouble,
      aKey,
    );
    return res.status(200).send({
      num: items.length,
      items,
      maxInt,
    });
  }

  @Get('discover-ascendant-matches/:dt?/:lng?/:orb?/:ayanamshaKey?/:max?')
  async discoverAscendantMatches(
    @Res() res,
    @Param('dt') dt,
    @Param('lng') lng,
    @Param('orb') orb,
    @Param('ayanamshaKey') ayanamshaKey,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);

    const orbDouble = isNumeric(orb) ? parseFloat(orb) : 1;

    const lngs = notEmptyString(lng)
      ? lng
          .split(',')
          .filter(lng => isNumeric(lng))
          .map(parseFloat)
      : [];

    const aKey = notEmptyString(ayanamshaKey, 3) ? ayanamshaKey : 'true_citra';

    const items = await this.astrologicService.matchAscendantsbyDate(
      dt,
      lngs,
      orbDouble,
      aKey,
      maxInt,
    );
    return res.status(200).send({
      num: items.length,
      items,
    });
  }

  @Get('kuta-match/:subtype/:k1/:k2/:minMax?/:limit?')
  async listPairedByKutas(
    @Res() res,
    @Param('subtype') subtype,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('minMax') minMax,
    @Param('limit') limit,
  ) {
    const kutaMap = await this.settingService.getKutaSettings();
    const pcRange = minMax
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);
    const limitInt = smartCastInt(limit, 1000);
    const range = pcRange.length > 1 ? pcRange : [0, 0];
    const result = await this.astrologicService.filterPairedByKutas(
      kutaMap,
      subtype,
      k1,
      k2,
      range,
    );
    const ids = result.items.map(item => item._id);
    const items = await this.astrologicService.getPairedByIds(ids, limitInt);
    return res.status(200).send({
      num: result.items.length,
      max: result.max,
      numItems: items.length,
      items,
    });
  }

  @Get('test-kuta/:subtype/:c1/:c2/:k1/:k2')
  async calcSingleKuta(
    @Res() res,
    @Param('subtype') subtype,
    @Param('c1') c1,
    @Param('c2') c2,
    @Param('k1') k1,
    @Param('k2') k2,
  ) {
    const kutaSet = await this.settingService.getKutaSettings();

    const co1 = await this.astrologicService.getChart(c1);
    const co2 = await this.astrologicService.getChart(c2);
    let result: any = {};
    if (co1 instanceof Object && co2 instanceof Object) {
      const chart1 = new Chart(co1);
      const chart2 = new Chart(co2);
      const kutaBuilder = new Kuta(chart1, chart2);
      kutaBuilder.loadCompatibility(kutaSet);
      const g1 = chart1.graha(k1);
      const g2 = chart2.graha(k2);
      result = kutaBuilder.calcSingleKuta(subtype, g1, g2);
    }
    return res.status(200).send(result);
  }

  @Get('condition-match/:type/:subtype/:k1/:k2/:opts?/:max?')
  async listByCondtion(
    @Res() res,
    @Param('type') type,
    @Param('subtype') subtype,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('opts') opts,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 1000);
    let num = 0;
    let ids: string[] = [];
    if (type === 'aspect') {
      const orb = isNumeric(opts) ? smartCastInt(opts, 1) : 1;
      const orbDouble = await this.matchOrb(subtype, k1, k2, orb);
      const data = await this.astrologicService.filterPairedByAspect(
        subtype,
        k1,
        k2,
        orbDouble,
      );
      num = data instanceof Array ? data.length : 0;
      ids = data.map(row => row._id);
    }
    const results =
      num > 0 ? await this.astrologicService.getPairedByIds(ids, maxInt) : [];
    return res.status(200).send({
      valid: results.length > 0,
      opts,
      num,
      type,
      subtype,
      numResults: results.length,
      results,
    });
  }

  async matchOrb(
    aspect: string,
    k1: string,
    k2: string,
    orbRef: string | number,
  ) {
    let orbDouble = 1;
    const protocolId = typeof orbRef === 'string' ? orbRef : '';
    if (notEmptyString(protocolId, 12)) {
      const orbs = await this.settingService.getProtocolCustomOrbs(protocolId);
      if (orbs.length > 0) {
        orbDouble = matchOrbFromGrid(aspect, k1, k2, orbs);
      }
    } else if (isNumeric(orbRef)) {
      orbDouble = smartCastFloat(orbRef, -1);
    }
    if (orbDouble < 0) {
      if (orbRef === 'auto') {
        const matchedOrbData = calcOrb(aspect, k1, k2);
        orbDouble = matchedOrbData.orb;
      }
    }
    return orbDouble;
  }

  @Get('translate-conditions/:protocolID')
  async translateConditions(
    @Res() res,
    @Param('protocolID') protocolID: string,
  ) {
    const randomPairedChart = await this.astrologicService.getPairedRandom();
    const protocol = await this.buildProtocol(protocolID);
    const kutaSet = await this.settingService.getKutaSettings();
    const data = assessChart(protocol, randomPairedChart, kutaSet);
    return res.json(data);
  }

  // merge with preferences / psychometric data
  @Get('compatibility/:protocolID/:c1/:c2')
  async matchCompatibility(
    @Res() res,
    @Param('protocolID') protocolID: string,
    @Param('c1') c1: string,
    @Param('c2') c2: string,
  ) {
    const randomPairedChart = await this.astrologicService.getPairedByChartIDs(
      c1,
      c2,
    );
    const protocol = await this.buildProtocol(protocolID);
    const kutaSet = await this.settingService.getKutaSettings();
    const data = assessChart(protocol, randomPairedChart, kutaSet);
    return res.json(data);
  }

  // merge with preferences / psychometric data
  @Get('test-rule/:protocolID/:colRef/:ruleIndex/:start?/:limit')
  async testCompatibilityRule(
    @Res() res,
    @Param('protocolID') protocolID: string,
    @Param('colRef') colRef: string,
    @Param('ruleIndex') ruleIndex,
    @Param('start') start,
    @Param('limit') limit,
    @Query() query,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 1000);
    const filterRuleIndex = smartCastInt(ruleIndex, -1);
    const data = await this.matchByProtocol(
      protocolID,
      query,
      startInt,
      limitInt,
      colRef,
      filterRuleIndex,
    );
    return res.json(data);
  }

  async matchByProtocol(
    protocolID = '',
    query = null,
    start = 0,
    limit = 1000,
    colRef = '',
    filterRuleIndex = -1,
  ) {
    const pairedcCharts = await this.astrologicService.getPairedCharts(
      start,
      limit,
      [],
      query,
    );
    const protocol = await this.buildProtocol(protocolID);
    const data = { num: 0, items: [], rule: null };
    const kutaSet = await this.settingService.getKutaSettings();
    pairedcCharts.forEach(pc => {
      const row = assessChart(protocol, pc, kutaSet, colRef, filterRuleIndex);
      if (compatibilityResultSetHasScores(row)) {
        data.items.push(row);
      }
    });
    if (notEmptyString(colRef) && filterRuleIndex >= 0) {
      const col = protocol.collections.find(cl => cl.type === colRef);
      if (col instanceof Object) {
        if (col.rules instanceof Array) {
          if (filterRuleIndex < col.rules.length) {
            data.rule = col.rules[filterRuleIndex];
          }
        }
      }
    }
    data.num = data.items.length;
    return data;
  }

  @Get('test-protocols/:protocolID/:start?/:limit?/:status?')
  async testProtocols(
    @Res() res,
    @Param('protocolID') protocolID: string,
    @Param('start') start,
    @Param('limit') limit,
    @Param('status') status: string,
    @Query() query,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const pairedcCharts = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
      [],
      query,
    );
    const protocol = await this.buildProtocol(protocolID);
    const kutaSet = await this.settingService.getKutaSettings();
    const data = { items: [], total: 0 };
    pairedcCharts.forEach(pc => {
      const row = assessChart(protocol, pc, kutaSet);
      data.items.push(row);
    });
    data.total = await this.astrologicService.numPairedCharts(query);
    return res.json(data);
  }

  @Get('num-paired-charts')
  async numPairedCharts(@Res() res) {
    const criteria = res.query instanceof Object ? res.query : {};
    const num = await this.astrologicService.numPairedCharts(criteria);
    return res.json({ num });
  }

  /*
  Save new protocol with nested rules-collections
  */
  @Put('protocol/rule/:itemID/:colRef/:ruleIndex/:saveFlag?/:max?')
  async saveProtcolRule(
    @Res() res,
    @Body() ruleSet: RuleSetDTO,
    @Param('itemID') itemID,
    @Param('colRef') colRef,
    @Param('ruleIndex') ruleIndex,
    @Param('saveFlag') saveFlag,
    @Param('max') max,
    @Query() query,
  ) {
    const index = smartCastInt(ruleIndex, 0);
    const saveRuleInProtocol = smartCastInt(saveFlag, 0) > 0;
    const limitInt = smartCastInt(max, 1000);
    const limit = limitInt > 100 && limitInt < 1000000 ? limitInt : 1000;
    const result = {
      valid: false,
      item: null,
      matches: [],
      num: -1,
      limit,
    };
    let hasValidRule = false;
    if (saveRuleInProtocol) {
      const saved = await this.settingService.saveRuleSet(
        itemID,
        colRef,
        index,
        ruleSet,
      );
      hasValidRule = saved.valid;
      result.item = saved.item;
    } else {
      hasValidRule = true;
    }
    if (hasValidRule) {
      result.valid = true;
      const matchData = await this.matchByProtocol(
        itemID,
        query,
        0,
        limit,
        colRef,
        index,
      );
      if (!saveRuleInProtocol) {
        result.item = matchData.rule;
      }
      if (matchData.num > 0) {
        result.matches = matchData.items;
        result.num = matchData.num;
      }
    }
    return res.status(HttpStatus.OK).send(result);
  }

  async buildProtocol(protocolID: string): Promise<Protocol> {
    const result = await this.settingService.getProtocol(protocolID);
    const settings = await this.settingService.getProtocolSettings();
    let protocol = new Protocol(null, settings);
    if (result instanceof Object) {
      const keys = Object.keys(result.toObject());
      if (keys.includes('collections')) {
        protocol = new Protocol(result, settings);
      }
    }
    return protocol;
  }

  @Get('karana-yogas/:start?/:limit?')
  async showKaranaYogas(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const maxInt = smartCastInt(limit, 1000);
    const limitInt = maxInt > 0 ? maxInt : 1000;
    const items = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
      ['numValues', 'stringValues'],
    );

    const result = {
      valid: items.length > 0,
      num: items.length,
      items: items.map(mapNestedKaranaTithiYoga),
    };
    return res.json(result);
  }

  @Get('paired-charts-steps')
  async showPairedChartSteps(@Res() res) {
    const steps = await this.astrologicService.getPairedChartSteps();
    return res.json(steps);
  }

  @Get('get-paired-charts/:start/:limit')
  async getPairedCharts(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Query() query,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const steps = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
      [],
      query,
    );

    return res.json(steps);
  }

  @Post('save-paired')
  async savePairedChart(
    @Res() res,
    @Body() inData: PairedChartInputDTO,
    @Query() query,
  ) {
    const { relName } = query;
    if (notEmptyString(relName, 2)) {
      const newType = {
        key: inData.relType,
        name: relName,
      };
      this.settingService.saveRelationshipType(newType);
    }
    const data = await this.savePairedChartData(inData);
    const statusCode = data.valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(statusCode).send(data);
  }

  @Get('recalc-paired-charts/:userID/:start?/:limit?')
  async recalcPairedCharts(
    @Res() res,
    @Param('userID') userID,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 0);
    const pairedCharts = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
    );
    const data = {
      updated: 0,
    };
    for (const pc of pairedCharts) {
      const inData = {
        user: userID,
        c1: pc.c1._id,
        c2: pc.c2._id,
        relType: pc.relType,
        span: pc.span,
        startYear: pc.startYear,
        endYear: pc.endYear,
        tags: pc.tags,
        notes: pc.notes,
        isNew: false,
      } as PairedChartInputDTO;
      await this.savePairedChartData(inData);
      data.updated++;
    }
    return res.send(data);
  }

  async savePairedChartData(inData: PairedChartInputDTO) {
    const c1 = await this.astrologicService.getChart(inData.c1);
    const c2 = await this.astrologicService.getChart(inData.c2);
    const midMode = inData.mode === 'surface' ? 'surface' : 'median';
    /* if (c1 && c2) {
      const midJd = (c1.jd + c2.jd) / 2;
      const midLng = midPointSurface(c1.geo, c2.geo);
    } */
    const validC1 = c1 instanceof Object;
    const validC2 = c2 instanceof Object;
    let surfaceGeo = { lat: 0, lng: 0 };
    let surfaceAscendant = 0;
    if (validC1 && validC2) {
      const midJd = (c1.jd + c2.jd) / 2;
      const datetime = jdToDateTime(midJd);

      surfaceGeo = midPointSurface(c1.geo, c2.geo);
      const mid =
        midMode === 'surface' ? surfaceGeo : medianLatlng(c1.geo, c2.geo);
      const dtUtc = applyTzOffsetToDateString(datetime, 0);
      const { tz, tzOffset } = await this.geoService.fetchTzData(
        mid,
        dtUtc,
        true,
      );
      const tsData = await calcCompactChartData(
        dtUtc,
        { ...mid, alt: 0 },
        'top',
        [],
        tzOffset,
      );
      let surfaceTzOffset = 0;
      if (midMode !== 'surface') {
        const surfaceTime = await this.geoService.fetchTzData(
          surfaceGeo,
          dtUtc,
          true,
        );
        const surfaceData = await fetchHouseData(
          dtUtc,
          { ...surfaceGeo, alt: 0 },
          'W',
        );
        if (surfaceData instanceof Object) {
          surfaceAscendant = surfaceData.ascendant;
          surfaceTzOffset = surfaceTime.tzOffset;
        }
      }
      const { user } = inData;
      let { notes, tags } = inData;
      if (!tags) {
        tags = [];
      }
      if (!notes) {
        notes = '';
      }
      const baseChart = {
        ...tsData,
        datetime: utcDate(dtUtc),
        tz,
        tzOffset,
      };
      const pairedDTO = {
        user,
        c1: inData.c1,
        c2: inData.c2,
        timespace: this.astrologicService.assignBaseChart(baseChart),
        surfaceGeo,
        surfaceAscendant,
        surfaceTzOffset,
        midMode,
        notes,
        startYear: inData.startYear,
        endYear: inData.endYear,
        span: inData.span,
        relType: inData.relType,
        tags,
      } as PairedChartDTO;
      const { isNew } = inData;
      const createNew = isNew === true;
      const setting = await this.settingService.getByKey('kuta_variants');
      const paired = await this.astrologicService.savePaired(
        pairedDTO,
        setting,
        createNew,
      );
      return {
        valid: true,
        paired,
        msg: `saved`,
      };
    } else {
      const invalidKeys = [];
      if (!validC1) {
        invalidKeys.push(c1);
      }
      if (!validC2) {
        invalidKeys.push(c2);
      }
      const chartIds = invalidKeys.join(', ');
      return {
        valid: false,
        msg: `Chart IDs not matched ${chartIds}`,
      };
    }
  }

  @Get('paired-tag-options/:reset?/:userID?')
  async pairedTagOptions(
    @Res() res,
    @Param('reset') reset,
    @Param('userID') userID,
  ) {
    const useDefaultOpts = smartCastBool(reset, false);
    const resetOpts =
      useDefaultOpts &&
      notEmptyString(userID, 12) &&
      (await this.userService.isAdminUser(userID));
    const data = await this.settingService.getPairedVocabs(
      useDefaultOpts,
      resetOpts,
    );
    return res.json(data);
  }

  @Get('tag-stats/:limit?')
  async getTagStats(@Res() res, @Param('limit') limit) {
    const limitInt = smartCastInt(limit, 100 * 1000);
    const data = await this.astrologicService.tagStats(limitInt);
    return res.json(data);
  }

  @Get('trait-tags/:mode?/:limit?')
  async getTraitTags(@Res() res, @Param('mode') mode, @Param('limit') limit) {
    const limitInt = smartCastInt(limit, 100 * 1000);
    const shortOnly = mode !== 'long';
    const data = await this.astrologicService.getTraits(shortOnly, limitInt);
    return res.json(data);
  }

  @Post('reassign-paired-tags')
  async reassignPairedTags(@Res() res, @Body() tagReassignDto: TagReassignDTO) {
    const { source, target, years, notes, remove } = tagReassignDto;

    const emptyTagDTO = { slug: '', name: '', vocab: '' } as TagDTO;
    const hasSource = source instanceof Object;
    const sourceTag = hasSource ? source : emptyTagDTO;
    const hasTarget = target instanceof Object;
    const targetTag = hasTarget ? target : emptyTagDTO;
    const yearSpan = typeof years === 'number' && years > 0 ? years : -1;
    const removeTag = remove === true && !hasTarget;
    const addToNotes = notes === true;
    const validInput =
      hasSource && (hasTarget || yearSpan > 0 || addToNotes || removeTag);
    /* const data = {
      source: sourceTag,
      target: targetTag,
      years: yearSpan,
      validInput,
    }; */
    let ids: string[] = [];
    if (validInput) {
      ids = await this.astrologicService.reassignTags(
        source,
        target,
        years,
        addToNotes,
      );
    }
    return res.json({
      ids,
      source: sourceTag,
      target: targetTag,
      years: yearSpan,
      notes: addToNotes,
      valid: validInput,
    });
  }

  @Get('sanitize-tags/:start?/:limit?')
  async sanitizeTags(@Res() res, @Param('start') start, @Param('limit') limit) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 1000);
    const data = await this.astrologicService.sanitizePairedCharts(
      startInt,
      limitInt,
    );
    return res.json(data);
  }

  @Get('has-other-pairings/:c1/:c2')
  async hasOtherPairings(@Res() res, @Param('c1') c1, @Param('c2') c2) {
    const data = await this.astrologicService.findPairings(c1, c2);
    return res.json(data);
  }

  @Delete('delete-paired/:c1/:c2/:userID/:remCharts?')
  async deletePairedAndRelated(
    @Res() res,
    @Param('c1') c1,
    @Param('c2') c2,
    @Param('userID') userID,
    @Param('remCharts') remCharts,
  ) {
    const data = { valid: false, paired: null, chart1: null, chart2: null };
    if (this.userService.isAdminUser(userID)) {
      const removeCharts = smartCastBool(remCharts);
      const result = await this.astrologicService.removePairedAndCharts(
        c1,
        c2,
        removeCharts,
      );
      data.paired = result.paired;
      data.chart1 = result.chart1;
      data.chart2 = result.chart2;
      data.valid = true;
    }
    return res.json(data);
  }

  /*
    Delete chart by paired id with userID to check permissions
  */
  @Delete('delete-paired/:pairedID/:userID')
  async deletePairedChart(
    @Res() res,
    @Param('pairedID') pairedID: string,
    @Param('userID') userID: string,
  ) {
    const data = { valid: false, pairedID: '' };
    let status = HttpStatus.NOT_ACCEPTABLE;
    if (this.userService.isAdminUser(userID)) {
      const deleted = await this.astrologicService.deletePaired(pairedID);
      if (deleted) {
        data.pairedID = deleted;
        data.valid = true;
        status = HttpStatus.OK;
      }
    }
    return res.status(status).json(data);
  }

  @Get('calc-paired/:loc1/:dt1/:loc2/:dt2/:mode?')
  async calcPairedChart(
    @Res() res,
    @Param('loc1') loc1: string,
    @Param('dt1') dt1: string,
    @Param('loc2') loc2: string,
    @Param('dt2') dt2: string,
    @Param('mode') mode: string,
  ) {
    const midMode = mode === 'median' ? 'median' : 'surface';

    let data: any = { valid: false };
    const validC1 = validISODateString(dt1) && notEmptyString(loc1);
    const validC2 = validISODateString(dt2) && notEmptyString(loc2);

    if (validC1 && validC2) {
      const geo1 = locStringToGeo(loc1);
      const geo2 = locStringToGeo(loc2);
      const jd1 = calcJulDate(dt1);
      const jd2 = calcJulDate(dt2);
      const midJd = (jd2 + jd1) / 2;
      const datetime = jdToDateTime(midJd);
      const mid =
        midMode === 'surface'
          ? midPointSurface(geo1, geo2)
          : medianLatlng(geo1, geo2);

      const dtUtc = applyTzOffsetToDateString(datetime, 0);
      const { tz, tzOffset } = await this.geoService.fetchTzData(mid, dtUtc);
      data = await calcCompactChartData(
        dtUtc,
        { ...mid, alt: 0 },
        'top',
        [],
        tzOffset,
      );

      return res.json({
        c1: {
          jd: jd1,
          geo: geo1,
        },
        c2: { jd: jd2, geo: geo2 },
        timespace: data,
        tz,
      });
    } else {
      return res.json({
        valid: false,
        msg: `Invalid dates or coordinates`,
      });
    }
  }

  @Get('paired/:userID/:max?')
  async getPairedByUser(
    @Res() res,
    @Param('userID') userID: string,
    @Param('max') max: string,
    @Query() query,
  ) {
    const limit = smartCastInt(max, 0);
    const items = await this.astrologicService.getPairedByUser(
      userID,
      limit,
      query,
    );
    return res.json({
      valid: true,
      items,
    });
  }

  @Get('kutas/:c1/:c2')
  async getKutas(@Res() res, @Param('c1') c1: string, @Param('c2') c2: string) {
    const paired = await this.astrologicService.getPairedByChartIDs(c1, c2);
    const result: Map<string, any> = new Map();
    if (paired instanceof Object) {
      const c1 = new Chart(paired.c1);
      const c2 = new Chart(paired.c2);
      c1.setAyanamshaItemByNum(27);
      c2.setAyanamshaItemByNum(27);
      /* const kutas = c1.grahas.map(gr1 => {
        return matchNaturalGrahaMaitri(gr1, gr2);
      }); */
      const kutaBuilder = new Kuta(c1, c2);
      const kutaSet = await this.settingService.getKutas();
      kutaBuilder.loadCompatibility(kutaSet);
      const kutas = kutaBuilder.calcAllSingleKutas();
      result.set('kutas', kutas);
      const simpleC1 = simplifyChart(paired.c1, 'true_citra');
      const simpleC2 = simplifyChart(paired.c2, 'true_citra');
      result.set('c1', simpleC1);
      result.set('c2', simpleC2);
    }
    return res.json(Object.fromEntries(result));
  }

  @Get('kuta-set')
  async toSimpleKutas(@Res() res, @Query() query) {
    const params = objectToMap(query);
    const result: Map<string, any> = new Map();
    const dt1 = params.get('dt1');
    const loc1 = params.get('loc1');
    const name1 = params.get('n1');
    const gender1 = params.get('g1');
    const skipCache = params.has('sk')
      ? smartCastInt(params.get('sk'), 0) > 0
      : false;
    const showChartData = params.get('show') === 'c';
    const grahaKeyRef = params.has('gks') ? params.get('gks') : '';
    const grahaKeys =
      grahaKeyRef === 'basic'
        ? ['su', 'mo', 've', 'as']
        : grahaKeyRef.split(',').filter(k => k.length === 2);
    const kutaType = params.has('set') ? params.get('set') : 'dvadasha';
    const kutaSetType = notEmptyString(kutaType, 1) ? kutaType : 'dvadasha';

    const allCombosRaw = params.has('combos') ? params.get('combos') : '0';
    const allCombos = smartCastInt(allCombosRaw) > 0;
    const puid = params.has('puid') ? params.get('puid') : '';
    const hasPuid = isValidObjectId(puid);
    let email = '';
    let hasEmail = false;
    result.set('valid', false);
    result.set('kutas', []);
    if (!hasPuid) {
      if (params.has('email')) {
        email = params.get('email');
        hasEmail = validEmail(email);
      }
    }
    const hasUserRef = hasPuid || hasEmail;
    const pNum = params.has('pn') ? params.get('pn') : '1';
    const refNum = isNumeric(pNum) ? smartCastInt(pNum, 1) : 1;
    let user: any = null;
    let cKey = '';
    let pairIndex = -1;
    let c1 = null;
    let c2 = null;
    let hasCharts = false;
    if (hasUserRef) {
      const userRef = hasPuid ? puid : email;
      const matchType = hasPuid ? 'id' : 'email';
      user = await this.userService.getPublicUser(userRef, matchType);
      if (user instanceof Model) {
        cKey = ['astro_pair', refNum].join('_');
        pairIndex = user.preferences.findIndex(
          pf => pf.type === 'simple_astro_pair' && pf.key === cKey,
        );
      }
    }
    const kutaSet = await this.settingService.getKutas(skipCache);
    if (validISODateString(dt1) && notEmptyString(loc1, 3)) {
      c1 = await generateBasicChart(dt1, loc1, name1, gender1);

      const dt2 = params.get('dt2');
      const loc2 = params.get('loc2');
      const name2 = params.get('n2');
      const gender2 = params.get('g2');
      const tO1 = params.get('to1');
      const tO2 = params.get('to2');
      const r1 = params.get('r1');
      const r2 = params.get('r2');
      const rod1 = isNumeric(r1) ? parseInt(r1) : 200;
      const rod2 = isNumeric(r2) ? parseInt(r2) : 200;
      const e1 = params.get('e1');
      const e2 = params.get('e2');
      const et1 = notEmptyString(e1) ? e1.toLowerCase() : 'birth';
      const et2 = notEmptyString(e2) ? e2.toLowerCase() : 'birth';
      if (validISODateString(dt2) && notEmptyString(loc2, 3)) {
        c2 = await generateBasicChart(dt2, loc2, name2, gender2);
        c2.setAyanamshaItemByKey('true_citra');
        hasCharts = true;
        const pl1 = params.has('pl1') ? params.get('pl1') : '';
        const pl2 = params.has('pl2') ? params.get('pl2') : '';
        const simpleC1 = c1.toBaseSet();
        const simpleC2 = c2.toBaseSet();
        const p1 = {
          ...simpleC1,
          name: name1,
          gender: gender1,
          tzOffset: smartCastInt(tO1, 0),
          placeName: pl1,
          eventType: et1,
          roddenValue: rod1,
        };
        const p2 = {
          ...simpleC2,
          name: name2,
          gender: gender2,
          tzOffset: smartCastInt(tO2, 0),
          placeName: pl2,
          eventType: et2,
          roddenValue: rod2,
        };
        if (hasPuid) {
          const newPref = {
            key: cKey,
            type: 'simple_astro_pair',
            value: {
              ayanamshaKey: 'true_citra',
              p1,
              p2,
            },
          } as PreferenceDTO;
          this.userService.savePublicPreference(puid, newPref);
        }
        result.set('p1', p1);
        result.set('p2', p2);
        result.set('pcKey', cKey);
      }
    } else if (hasUserRef) {
      const pref = pairIndex < 0 ? null : user.preferences[pairIndex];
      if (pref instanceof Object) {
        const pairData = pref.value;
        if (pairData instanceof Object) {
          const dataKeys = Object.keys(pairData);
          if (dataKeys.includes('p1') && dataKeys.includes('p2')) {
            c1 = basicSetToFullChart(pairData.p1);
            c2 = basicSetToFullChart(pairData.p2);
            hasCharts = true;
            result.set('p1', pairData.p1);
            result.set('p2', pairData.p2);
            result.set('pcKey', cKey);
          }
        }
      }
    }
    if (hasCharts) {
      c1.setAyanamshaItemByKey('true_citra');
      c2.setAyanamshaItemByKey('true_citra');
      if (showChartData) {
        result.set('c1', c1);
        result.set('c2', c2);
      }
      const kutaBuilder = new Kuta(c1, c2);
      kutaBuilder.loadCompatibility(kutaSet);
      const kutas = kutaBuilder.calcAllSingleKutas(
        true,
        grahaKeys,
        kutaSetType,
        allCombos,
      );
      result.set('kutas', kutas);
      result.set('valid', true);
    }
    return res.json(Object.fromEntries(result));
  }

  @Get('public-pairs/:start?/:numUsers?')
  async fetchPublicCharts(
    @Res() res,
    @Param('start') start,
    @Param('numUsers') numUsers,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(numUsers, 100);
    const items = await this.userService.fetchPublicAstroPairs(
      startInt,
      limitInt,
    );
    return res.json(items);
  }

  @Get('aspects/:c1/:c2')
  async getAspects(
    @Res() res,
    @Param('c1') c1: string,
    @Param('c2') c2: string,
  ) {
    const paired = await this.astrologicService.getPairedByChartIDs(c1, c2);
    const result: Map<string, any> = new Map();
    if (paired instanceof Object) {
      const c1 = new Chart(paired.c1);
      const c2 = new Chart(paired.c2);
      c1.setAyanamshaItemByNum(27);
      c2.setAyanamshaItemByNum(27);
      /* const kutas = c1.grahas.map(gr1 => {
        return matchNaturalGrahaMaitri(gr1, gr2);
      }); */
      const kutaBuilder = new Kuta(c1, c2);
      const kutaSet = await this.settingService.getKutas();
      kutaBuilder.loadCompatibility(kutaSet);

      const aspects = calcAllAspects(c1, c2);
      result.set('aspects', aspects);
      const simpleC1 = simplifyChart(paired.c1, 'true_citra');
      const simpleC2 = simplifyChart(paired.c2, 'true_citra');
      result.set('c1', simpleC1);
      result.set('c2', simpleC2);
    }
    return res.json(Object.fromEntries(result));
  }

  @Post('aspects-grid')
  async getAspectGrid(@Res() res, @Body() pairsSet: PairsSetDTO) {
    const pairedCds = [];
    for (const pair of pairsSet.pairs) {
      const paired = await this.astrologicService.getPairedByChartIDs(
        pair.c1,
        pair.c2,
      );
      if (paired instanceof Object) {
        const { relType, tags, startYear, endYear, span } = paired;
        const c1 = new Chart(paired.c1);
        const c2 = new Chart(paired.c2);
        const aspects = calcAllAspects(c1, c2);
        pairedCds.push({
          name1: c1.subject.name,
          name2: c2.subject.name,
          relType,
          startYear,
          endYear,
          span,
          tags,
          aspects,
        });
      }
    }
    return res.json({ grid: pairedCds });
  }

  @Get('chart/:chartID')
  async fetchChart(@Res() res, @Param('chartID') chartID: string) {
    const data: any = { valid: false, shortTz: '', chart: null, user: null };
    const chart = await this.astrologicService.getChart(chartID);
    if (chart instanceof Object) {
      data.chart = chart;
      const userID = chart.user.toString();
      data.user = await this.userService.getUser(userID);
      data.shortTz = toShortTzAbbr(chart.datetime, chart.tz);
      data.valid = true;
    }
    return res.json(data);
  }

  /*
   * Mobile only
   */
  @Get('extra-charts/:userID/:start?/:limit?')
  async fetchCExtraChartsByUser(
    @Res() res,
    @Param('userID') userID: string,
    @Param('start') start = '0',
    @Param('limit') limit = '100',
  ) {
    const data = {
      valid: false,
      items: [],
      message: 'invalid user ID',
      key: 'invalid',
    };
    const validIdentifier = isValidObjectId(userID);
    let status = validIdentifier
      ? HttpStatus.NOT_FOUND
      : HttpStatus.NOT_ACCEPTABLE;
    const user = await this.userService.getUser(userID);

    if (user instanceof Object) {
      if (user.active) {
        const startVal = smartCastInt(start, 0);
        const limitVal = smartCastInt(limit, 100);
        const chartObj = await this.astrologicService.getUserBirthChart(userID);
        let refChart = null;
        let hasRefChart = false;
        data.key = 'ok';
        if (chartObj instanceof Model) {
          refChart = new Chart(chartObj.toObject());
          refChart.setAyanamshaItemByKey('true_citra');
          hasRefChart = refChart.grahas.length > 6;
        }
        const charts = await this.astrologicService.getChartsByUser(
          userID,
          startVal,
          limitVal,
          false,
          { mode: 'other' },
          false,
        );
        if (charts instanceof Array && hasRefChart) {
          const kutaDict = await this.dictionaryService.getKutaDict();
          const customSettings = await this.settingService.customCompatibilitySettings(
            kutaDict,
          );
          data.items = [];
          for (const c of charts) {
            if (c instanceof Object) {
              const extraData = await this.astrologicService.fetchChartComparisons(
                c,
                refChart,
                customSettings,
                false,
              );
              const nickName = c.subject?.name;
              const pob = c.subject?.notes;
              data.items.push({ nickName, pob, ...extraData });
            }
          }
          data.valid = true;
          data.message = 'OK';
          status = HttpStatus.OK;
        } else {
          data.message = 'No charts available';
          status = HttpStatus.NO_CONTENT;
        }
      } else {
        data.message = 'Inactive account';
        if (user.roles.includes('blocked')) {
          data.key = 'blocked';
        } else {
          data.key = 'inactive';
        }
        status = HttpStatus.UNAUTHORIZED;
      }
    } else {
      data.key = 'not_found';
    }
    return res.status(status).json(data);
  }

  /*
   * AstroWebApp only
   */
  @Get('charts-by-user/:userID/:start?/:limit?/:defaultOnly?')
  async fetchChartsByUser(
    @Res() res,
    @Param('userID') userID: string,
    @Param('start') start = '0',
    @Param('limit') limit = '100',
    @Param('defaultOnly') defaultOnly = '0',
    @Query() query,
  ) {
    const data: any = { valid: false, items: [], message: 'invalid user ID' };
    const validId = isValidObjectId(userID);
    const user = validId ? await this.userService.getUser(userID) : null;
    const hasUser = user instanceof Object;
    const isDefaultBirthChart = smartCastInt(defaultOnly) > 0;
    const isAdmin = this.userService.hasAdminRole(user);
    let status = validId
      ? hasUser
        ? HttpStatus.OK
        : HttpStatus.NOT_FOUND
      : HttpStatus.NOT_ACCEPTABLE;
    if (user instanceof Object) {
      if (user.active) {
        const startVal = smartCastInt(start, 0);
        const limitVal = smartCastInt(limit, 10);
        const charts = await this.astrologicService.getChartsByUser(
          userID,
          startVal,
          limitVal,
          isDefaultBirthChart,
          query,
          isAdmin,
        );
        if (charts instanceof Array) {
          data.items = charts;
          data.valid = true;
          data.message = 'OK';
          status = HttpStatus.OK;
        } else {
          data.message = 'Inactive account';
          status = HttpStatus.NOT_ACCEPTABLE;
        }
      }
    }
    return res.status(status).json(data);
  }

  @Put('save-chart-order/:userID')
  async saveRecentChartOrder(
    @Res() res,
    @Param('userID') userID: string,
    @Body() idStrings: string[],
  ) {
    const result = await this.userService.saveRecentChartOrder(
      userID,
      idStrings,
    );
    return res.json(result);
  }

  @Get('recent-charts/:userID')
  async getRecentCharts(@Res() res, @Param('userID') userID: string) {
    const ids = await this.userService.getRecentChartIds(userID);
    const items: any[] = [];
    let num = 0;
    let valid = false;
    const matchedIds: string[] = [];
    if (ids.length > 0) {
      for (const id of ids) {
        const c = await this.astrologicService.getChart(id);
        if (c instanceof Model) {
          const cid = c._id.toString();
          if (matchedIds.includes(cid) === false) {
            if (c.subject.eventType === 'birth') {
              items.push(c);
              num++;
              matchedIds.push();
              if (!valid) {
                valid = true;
              }
            }
          }
        }
      }
    }
    if (items.length < 5) {
      const max = 20 - items.length;
      const charts = await this.astrologicService.getChartsByUser(
        userID,
        0,
        max,
        false,
        null,
        false,
      );
      if (charts.length > 0) {
        for (const c of charts) {
          const cid = c._id.toString();
          if (matchedIds.includes(cid) === false) {
            if (c.subject.eventType === 'birth') {
              items.push(c);
              num++;
            }
          }
        }
      }
    }
    return res.json({ valid, num, items });
  }

  @Get('chart-names-by-user/:userID/:search/:nameMode?')
  async fetchChartsByName(
    @Res() res,
    @Param('userID') userID: string,
    @Param('search') search: string,
    @Param('nameMode') nameMode: string,
  ) {
    const result: Map<string, any> = new Map();
    const longNameMode = nameMode === 'long';
    const charts = await this.astrologicService.getChartNamesByUserAndName(
      userID,
      search,
      20,
      longNameMode,
    );
    result.set('items', charts);
    const data = Object.fromEntries(result);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('chart-core-by-user/:userID/:start?/:limit?')
  async fetchChartsCoreData(
    @Res() res,
    @Param('userID') userID: string,
    @Param('start') start,
    @Param('limit') limit,
    @Query() query,
  ) {
    const result: Map<string, any> = new Map();
    const limitInt = smartCastInt(limit, 100);
    const startInt = smartCastInt(start, 0);
    const criteria = query instanceof Object ? query : {};
    const criteriaKeys = Object.keys(criteria);
    const name = criteriaKeys.includes('name') ? criteria.name : '';
    const search = notEmptyString(name)
      ? name
      : criteriaKeys.includes('search')
      ? criteria.search
      : '';
    const statusRef = criteriaKeys.includes('status')
      ? criteria.status.toLowerCase()
      : '';
    const charts = await this.astrologicService.getCoreChartDataByUser(
      userID,
      search,
      statusRef,
      startInt,
      limitInt,
    );
    const items = [];
    for (const row of charts) {
      const item = row.toObject();
      const {
        _id,
        isDefaultBirthChart,
        datetime,
        jd,
        tzOffset,
        geo,
        subject,
      } = item;
      const { name, gender, roddenValue } = subject;
      const { lat, lng, alt } = geo;
      const paired = await this.astrologicService.matchPairedIdsByChartId(
        item._id,
        true,
      );
      items.push({
        _id,
        isDefaultBirthChart,
        datetime,
        jd,
        tzOffset,
        lat,
        lng,
        alt,
        name,
        gender,
        roddenValue,
        paired,
      });
    }
    result.set('items', items);
    const total = await this.astrologicService.countCoreChartDataByUser(
      userID,
      search,
      statusRef,
    );
    const data = Object.fromEntries(result);
    return res.status(HttpStatus.OK).json({ ...data, total });
  }

  @Get('get-paired-items/:chartID')
  async getPairedItemsByChartId(@Res() res, @Param('chartID') chartID: string) {
    const data = await this.astrologicService.matchPairedIdsByChartId(
      chartID,
      true,
    );
    return res.status(HttpStatus.OK).json(data);
  }

  @Delete('delete-chart/:userID/:chartID')
  async deleteChart(
    @Res() res,
    @Param('userID') userID: string,
    @Param('chartID') chartID: string,
  ) {
    const data: any = {
      valid: false,
      message: 'invalid user ID',
      id: '',
      key: 'not_found',
    };
    const user = await this.userService.getUser(userID);
    let status = HttpStatus.OK;
    if (user instanceof Object) {
      if (user.active) {
        const chart = await this.astrologicService.getChart(chartID);
        data.key = 'ok';
        if (chart instanceof Object) {
          if (
            chart.user.toString() === userID ||
            this.userService.hasAdminRole(user)
          ) {
            this.astrologicService.deleteChart(chartID);
            data.valid = true;
            data.id = chartID;
            data.message = 'Chart deleted';
          } else {
            data.message = 'Permission denied';
            status = HttpStatus.FORBIDDEN;
          }
        } else {
          data.message = 'Chart not found';
          status = HttpStatus.NOT_FOUND;
        }
      } else {
        data.message = 'Inactive account';
        status = HttpStatus.UNAUTHORIZED;
        if (user.roles.includes('blocked')) {
          data.key = 'blocked';
        } else {
          data.key = 'inactive';
        }
      }
    }
    return res.status(status).json(data);
  }

  @Get('indian-time/:loc/:dt')
  async indianTimeByGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    const data: any = {
      valid: false,
      localDateTime: '',
      tzOffset: null,
      tz: null,
    };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const geoInfo = await this.geoService.fetchGeoAndTimezone(
        geo.lat,
        geo.lng,
        dt,
      );
      const dtUtc = applyTzOffsetToDateString(dt, geoInfo.offset);
      data.localDateTime = dt;
      data.tzOffset = geoInfo.offset;
      data.tz = geoInfo.tz;

      data.indianTime = await toIndianTime(dtUtc, geo);
      data.valid = true;
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('tzdata/:loc/:dt?')
  async timeZoneByGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    const refDt = validISODateString(dt) ? dt : currentISODate();
    if (notEmptyString(refDt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const data = await this.geoService.fetchTzData(geo, refDt);
      if (data.valid) {
        const shortTz = toShortTzAbbr(dt, data.tz);
        return res.status(HttpStatus.OK).json({ ...data, shortTz });
      } else {
        return res.status(HttpStatus.NOT_ACCEPTABLE).json(data);
      }
    } else {
      return res.status(HttpStatus.NOT_ACCEPTABLE).json({ valid: false });
    }
  }

  @Get('ascendant/:loc/:dt?/:ayanamsha?')
  async fetchAscendant(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('ayanamsha') ayanamsha,
  ) {
    const geo = locStringToGeo(loc);
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const { lat, lng } = geo;
    const ayanamshaKey = notEmptyString(ayanamsha, 5)
      ? ayanamsha
      : 'true_citra';
    const ayanamshaVal = await calcAyanamsha(jd, ayanamshaKey);
    const ascendant = calcOffsetAscendant(lat, lng, jd, ayanamshaVal);
    const hd = await fetchHouseDataJd(jd, geo);
    const lagna = subtractLng360(hd.ascendant, ayanamshaVal);
    return res.status(HttpStatus.OK).json({ ascendant, lagna, dt: dtUtc });
  }

  
}
