import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Setting } from './interfaces/setting.interface';
import { CreateSettingDTO } from './dto/create-setting.dto';
import defaultFlags from './sources/flags';
import { isNumeric, notEmptyString } from '../lib/validators';
import { Protocol } from './interfaces/protocol.interface';
import { ProtocolDTO } from './dto/protocol.dto';
import { mergeRoddenValues } from '../astrologic/lib/settings/rodden-scale-values';
import { KeyName } from '../astrologic/lib/interfaces';
import {
  clearRedisByKey,
  extractDocId,
  extractFromRedisClient,
  extractFromRedisMap,
  listEmptyRedisKeys,
  listRedisKeys,
  storeInRedis,
} from '../lib/entities';
import { defaultPairedTagOptionSets } from '../astrologic/lib/settings/vocab-values';
import { RuleSetDTO } from './dto/rule-set.dto';
import { IdBoolDTO } from './dto/id-bool.dto';
import { PredictiveRuleSet } from './interfaces/predictive-rule-set.interface';
import { PredictiveRuleSetDTO } from './dto/predictive-rule-set.dto';
import getDefaultPreferences, {
  buildSurveyOptions,
  translateItemKey,
} from '../user/settings/preference-options';
import multipleKeyScales from '../user/settings/multiscales';
import { PreferenceOption } from '../user/interfaces/preference-option.interface';
import { RedisService } from 'nestjs-redis';
import * as Redis from 'ioredis';
import { ProtocolSettings } from '../astrologic/lib/models/protocol-models';
import { smartCastFloat, smartCastInt } from '../lib/converters';
import permissionValues, {
  limitPermissions,
} from '../user/settings/permissions';
import {
  analyseAnswers,
  filterMapSurveyByType,
  normalizeFacetedAnswer,
  summariseJungianAnswers,
  transformUserPreferences,
} from './lib/mappers';
import { FacetedItemDTO } from './dto/faceted-item.dto';
import eventTypeValues from '../astrologic/lib/settings/event-type-values';
import { mapLikeability } from '../lib/notifications';
import { filterCorePreference } from '../lib/mappers';
import { mapPPRule, PPRule } from '../astrologic/lib/settings/pancha-pakshi';
import { KotaCakraScoreSet } from '../astrologic/lib/settings/kota-values';
import { DeviceVersion } from './lib/interfaces';
import { defaultDeviceVersions } from './settings/device-versions';
import { DeviceVersionDTO } from './dto/device-version.dto';

@Injectable()
export class SettingService {
  constructor(
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
    @InjectModel('Protocol')
    private readonly protocolModel: Model<Protocol>,
    @InjectModel('PredictiveRuleSet')
    private readonly predictiveRuleSetModel: Model<PredictiveRuleSet>,
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

  async redisSet(key: string, value: any = null, expire = 0): Promise<boolean> {
    const client = await this.redisClient();
    return await storeInRedis(client, key, value, expire);
  }

  async clearCacheByKey(key = ''): Promise<boolean> {
    const client = await this.redisClient();
    return await clearRedisByKey(client, key);
  }

  async getRedisKeys(key = '', max = -1) {
    const client = await this.redisClient();
    return await listRedisKeys(client, key, max);
  }

  async getEmptyRedisKeys(deleteAll = false) {
    const client = await this.redisClient();
    return await listEmptyRedisKeys(client, deleteAll);
  }

  // fetch all Settings
  async getAllSetting(): Promise<Setting[]> {
    const Settings = await this.settingModel
      .find()
      .sort({ weight: 1 })
      .exec();
    return Settings;
  }
  // fetch all Settings with keys and values only
  async getAll(): Promise<Setting[]> {
    const Settings = await this.settingModel
      .find()
      .select({ key: 1, value: 1, _id: 0 })
      .sort({ weight: 1 })
      .exec();
    return Settings;
  }

  // fetch all Settings with keys and values only
  async getCustom(): Promise<Setting[]> {
    const Settings = await this.settingModel
      .find({ type: 'custom' })
      .select({
        key: 1,
        type: 1,
        notes: 1,
        weight: 1,
        createdAt: 1,
        modifiedAt: 1,
      })
      .sort({ weight: 1 })
      .exec();
    return Settings;
  }

  // Get a single Setting
  async getSetting(settingID = ''): Promise<Setting> {
    const setting = await this.settingModel.findById(settingID).exec();
    return setting;
  }

  // Match many pattern
  async getByKeyPattern(pattern: string): Promise<Setting[]> {
    const rgx = new RegExp(pattern, 'i');
    return await this.settingModel.find({ key: rgx }).exec();
  }

  // get a single setting by key
  async getByKey(key: string): Promise<Setting> {
    const data = await this.settingModel.findOne({ key }).exec();
    let newValue = null;
    let result: any = {};
    if (data instanceof Object) {
      result = data.toObject();
      switch (key) {
        case 'rodden_scale_values':
          newValue = mergeRoddenValues(data.value);
          break;
        default:
          newValue = data.value;
          break;
      }
    }
    return { ...result, value: newValue };
  }

  // get a kuta variants
  async getKutaSettings(resetCache = false): Promise<Map<string, any>> {
    const key = 'kuta_variants';
    const stored = resetCache ? [] : await this.redisGet(key);
    const hasStored =
      stored instanceof Object && Object.keys(stored).length > 0;
    if (hasStored) {
      return new Map(Object.entries(stored));
    } else {
      const data = await this.getByKey(key);
      const itemObj =
        data instanceof Object &&
        Object.keys(data).includes('value') &&
        data.value instanceof Object
          ? data.value
          : {};
      this.redisSet(key, itemObj);
      return new Map(Object.entries(itemObj));
    }
  }

  async getSubjectDataSetsRaw() {
    const roddenData = await this.getByKey('rodden_scale_values');
    const rodItems = roddenData.value instanceof Array ? roddenData.value : [];
    const relData = await this.getByKey('relationship_types');
    const relItems = relData.value instanceof Array ? relData.value : [];
    const eventTypes = eventTypeValues;
    return {
      rodden: rodItems.filter(r => r instanceof Object && r.enabled),
      relations: relItems,
      eventTypes,
    };
  }

  async getSubjectDataSets() {
    const cKey = 'subject-data-sets';
    const data = await this.redisGet(cKey);
    if (data instanceof Object && Object.keys(data).includes('relations')) {
      return data;
    } else {
      const result = await this.getSubjectDataSetsRaw();
      this.redisSet(cKey, result);
      return result;
    }
  }

  async getPreferences() {
    const setting = await this.getByKey('preference_options');
    return setting instanceof Object ? setting.value : [];
  }

  async getPreferenceKeys() {
    const items = await this.settingModel
      .find({ type: 'preferences' })
      .select({ _id: 0, key: 1 });
    return items instanceof Array
      ? items
          .map(item => item.key)
          .filter(key => key !== '_new')
          .filter((x, i, a) => a.indexOf(x) === i)
      : [];
  }

  async getPreferenceOptions(
    surveyKey = 'preference_options',
  ): Promise<Array<PreferenceOption>> {
    const setting = await this.getByKey(surveyKey);
    let data: Array<PreferenceOption> = [];
    if (!setting) {
      data = getDefaultPreferences(surveyKey);
    } else {
      if (setting.value instanceof Array) {
        data = setting.value.map(row => {
          if (
            row instanceof Object &&
            row.type === 'multiple_key_scale' &&
            Object.keys(row).includes('options') &&
            row.options instanceof Array
          ) {
            row.options = row.options.map(opt => {
              return { ...opt, name: translateItemKey(opt.key) };
            });
          }
          return row;
        });
      }
    }
    return data;
  }

  async getPsychometricSurveys() {
    const surveys = await this.getSurveys();
    const big5 = surveys.find(sv => sv.key === 'faceted_personality_options');
    const jungian = surveys.find(sv => sv.key === 'jungian_options');
    const facetedQuestions = big5 instanceof Object ? big5.items : [];
    const jungianQuestions = jungian instanceof Object ? jungian.items : [];

    return { facetedQuestions, jungianQuestions };
  }

  async processPreferences(preferences: any[]) {
    const { surveys, multiscaleData } = await this.getSurveyData();
    return await this.processPreferenceData(
      preferences,
      surveys,
      multiscaleData,
    );
  }

  async processPreferenceData(
    preferences: any[],
    surveys: any[] = [],
    multiscaleData: any[] = [],
    simpleMode = false,
  ) {
    const preferenceItems = preferences
      .filter(filterCorePreference)
      .map(pref => transformUserPreferences(pref, surveys, multiscaleData));

    if (surveys.length > 0) {
      const big5 = surveys.find(sv => sv.key === 'faceted_personality_options');
      const jungian = surveys.find(sv => sv.key === 'jungian_options');
      const facetedQuestions = big5 instanceof Object ? big5.items : [];
      const jungianQuestions = jungian instanceof Object ? jungian.items : [];
      let facetedAnswers = [];
      let facetedAnalysis = {};
      let jungianAnswers = [];
      let jungianAnalysis = {};

      if (facetedQuestions instanceof Array && facetedQuestions.length > 0) {
        facetedAnswers = filterMapSurveyByType(
          preferences,
          'faceted',
          facetedQuestions,
        );
        const facetedCompleted =
          facetedAnswers.length >= facetedQuestions.length;
        facetedAnalysis = facetedCompleted
          ? analyseAnswers('faceted', facetedAnswers)
          : {};
        jungianAnswers = filterMapSurveyByType(
          preferences,
          'jungian',
          jungianQuestions,
        );
        const jungianCompleted =
          jungianAnswers.length >= jungianQuestions.length;
        jungianAnalysis = jungianCompleted
          ? simpleMode
            ? summariseJungianAnswers(jungianAnswers)
            : analyseAnswers('jungian', jungianAnswers)
          : {};
      }
      return {
        preferences,
        facetedAnswers,
        facetedAnalysis,
        jungianAnswers,
        jungianAnalysis,
      };
    } else {
      return { preferences: preferenceItems };
    }
  }

  async getSurveys(skipCache = false) {
    const key = 'pr_surveys';
    const stored = skipCache ? [] : await this.redisGet(key);
    const hasStored = stored instanceof Array && stored.length > 0;
    const rows = hasStored ? stored : await this.getAllSurveys();
    if (!hasStored && rows.length > 0) {
      this.redisSet(key, rows);
    }
    return rows;
  }

  async getSurveyData(skipCache = false) {
    const allSurveys = await this.getSurveys(skipCache);
    const surveys = allSurveys.filter(
      s => s.items instanceof Array && s.items.length > 0,
    );
    return {
      surveys,
      multiscaleData: await this.surveyMultiscales(skipCache),
    };
  }

  async getAllSurveys() {
    const keys = await this.getPreferenceKeys();
    const surveys: Array<any> = [];
    for (const key of keys) {
      const setting = await this.getByKey(key);
      if (setting instanceof Object) {
        const { value } = setting;
        if (value instanceof Array) {
          const num = value.length;
          const valid = num > 0;
          surveys.push({ key, items: value, num, valid });
        }
      }
    }
    return surveys;
  }

  async getSurveyItems(surveyKey = '', cached = true) {
    const key = ['survey_items', surveyKey].join('_');
    const stored = cached ? await this.redisGet(key) : [];
    let items = [];
    if (stored instanceof Array && stored.length > 0) {
      items = stored;
    } else {
      items = await this.getSurveyItemsRaw(surveyKey);
      if (items.length > 0) {
        this.redisSet(key, items);
      }
    }
    return items;
  }

  async analyseFacetedByType(
    type = 'faceted',
    items: FacetedItemDTO[] = [],
    feedbackItems = [],
    cached = true,
  ) {
    let responses = [];
    let analysis = {};
    const surveyKey =
      type === 'jungian' ? 'jungian_options' : 'faceted_personality_options';
    if (items instanceof Array) {
      const surveyItems = await this.getSurveyItems(surveyKey, cached);
      responses = items.map(item =>
        normalizeFacetedAnswer(item, surveyItems, false),
      );
      analysis = analyseAnswers(type, responses, feedbackItems);
    }
    return { responses, analysis };
  }

  async getSurveyItemsRaw(surveyKey = '') {
    const setting = await this.getByKey(surveyKey);
    let items = [];
    if (setting instanceof Object) {
      const { value } = setting;
      if (value instanceof Array) {
        items = value;
      }
    }
    return items;
  }

  async surveyMultiscales(skipCache = false): Promise<any[]> {
    const key = 'survey_multiscales';
    const stored = skipCache ? [] : await this.redisGet(key);
    const hasStored = stored instanceof Array && stored.length > 0;
    const rows = hasStored ? stored : await this.surveyMultiscaleList();
    if (!hasStored && rows.length > 0) {
      this.redisSet(key, rows);
    }
    return rows;
  }

  async surveyMultiscaleList() {
    const key = 'survey_multiscales';
    const setting = await this.getByKey(key);
    const hasValue =
      setting instanceof Object &&
      Object.keys(setting).includes('value') &&
      setting.value instanceof Array &&
      setting.value.length > 0;
    let data: Array<any> = [];
    if (!hasValue) {
      data = multipleKeyScales;
    } else {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    const dataWithOptions = data.map(item => {
      const valueOpts = buildSurveyOptions(item.key);
      return { ...item, options: valueOpts };
    });
    return dataWithOptions;
  }

  async getPermissionData(skipCache = false) {
    const key = 'permissions';
    const stored = skipCache ? null : await this.redisGet(key);
    if (stored instanceof Object) {
      return stored;
    } else {
      const roleData = await this.getByKey('roles');
      const roles = roleData.value instanceof Array ? roleData.value : [];
      const limitData = await this.getByKey('permission_limits');
      const limits = limitData.value instanceof Array ? limitData.value : [];
      const data = { roles, limits };
      this.redisSet(key, data);
      return data;
    }
  }

  async getFreeMemberLikeResetHours() {
    const data = await this.getByKey('free_member_like_reset_limit');
    return typeof data.value === 'number' ? data.value : 12;
  }

  async getEnabledPermissions(roleKeys: string[] = []) {
    const data = await this.getPermissionData();
    const permKeys = [];
    if (roleKeys instanceof Array) {
      roleKeys.forEach(roleKey => {
        this.filterOverrides(permKeys, data, roleKey);
      });
    }
    const entries = permKeys.map(key => {
      const limitRow = data.limits.find(lm => lm.key === key);
      const value =
        limitRow instanceof Object ? smartCastInt(limitRow.value, 0) : true;
      return [key, value];
    });
    return Object.fromEntries(entries);
  }

  async getPermissions(roleKeys: string[] = [], skipCache = false) {
    const data = await this.getPermissionData(skipCache);
    const permKeys = [];
    if (roleKeys instanceof Array) {
      roleKeys.forEach(roleKey => {
        this.filterOverrides(permKeys, data, roleKey);
      });
    }
    const entries = permKeys.map(key => {
      const limitRow = data.limits.find(lm => lm.key === key);
      const value =
        limitRow instanceof Object ? smartCastInt(limitRow.value, 0) : true;
      return [key, value];
    });
    const otherKeys = permissionValues
      .map(pm => pm.key)
      .filter(k => permKeys.includes(k) === false)
      .map(k => {
        const limitRow = data.limits.find(lm => lm.key === k);
        const value = limitRow instanceof Object ? 0 : false;
        return [k, value];
      });
    const rgx = /^(basic|extended|premium)_/;
    const coreEntries = [...entries, ...otherKeys].filter(([k, v]) => {
      return rgx.test(k) === false && typeof v === 'boolean';
    });
    const limitRows: any[][] = [];
    limitPermissions.forEach(pv => {
      const pvIndex = data.limits.findIndex(ld => ld.key === pv.key);
      const pvValue =
        pvIndex < 0 ? smartCastInt(pv.value) : data.limits[pvIndex].value;
      limitRows.push([pv.key, pvValue]);
    });
    return Object.fromEntries([...limitRows, ...coreEntries]);
  }

  async getMaxRatingLimit(roles: string[] = [], value = 0) {
    const maxKeyParts = ['swipe', mapLikeability(value, true)]
      .join('_')
      .split('|');
    const maxKey = maxKeyParts.length > 0 ? maxKeyParts[0] : 'wxyz';
    const maxKey2 = maxKeyParts.length > 1 ? maxKeyParts[1] : maxKey;
    const hasLimits = notEmptyString(maxKey);
    const perms = await this.getEnabledPermissions(roles);
    const likeLimits = Object.entries(perms)
      .filter(entry => entry[0].endsWith(maxKey) || entry[0].endsWith(maxKey2))
      .map(entry => smartCastInt(entry[1], 0));
    let maxRating = value < 1 ? 1000000 : value === 1 ? 20 : 5;
    if (hasLimits && likeLimits.length > 0) {
      maxRating = Math.max(...likeLimits);
    }
    return maxRating;
  }

  filterOverrides(permKeys: string[] = [], permData = null, roleKey = '') {
    if (permData instanceof Object) {
      const excludeKeys = ['all'];
      const { roles, limits } = permData;
      const current = roles.find(r => r.key === roleKey);
      if (current instanceof Object) {
        const { overrides, permissions, appAccess, adminAccess } = current;
        if (permissions instanceof Array) {
          if (appAccess) {
            if (!permKeys.includes('app_access')) {
              permKeys.push('app_access');
            }
          }
          if (adminAccess) {
            if (!permKeys.includes('admin_access')) {
              permKeys.push('admin_access');
            }
          }
          permissions.forEach(pk => {
            if (
              permKeys.includes(pk) === false &&
              excludeKeys.includes(pk) === false
            ) {
              permKeys.push(pk);
            }
          });
        }
        if (overrides instanceof Array) {
          overrides.forEach(rk => {
            this.filterOverrides(permKeys, permData, rk);
          });
        }
      }
    }
    return permKeys;
  }

  async saveRelationshipType(newType: KeyName) {
    const setting = await this.getByKey('relationship_types');
    let types: KeyName[] = [];
    if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        types = setting.value;
        const typeIndex = types.findIndex(tp => tp.key === newType.key);
        if (typeIndex < 0) {
          types.push(newType);
          const _id = extractDocId(setting);
          this.updateSetting(_id, {
            value: types,
            modifiedAt: new Date(),
          } as CreateSettingDTO);
        }
      }
    }
    return types;
  }

  async getProtocolSettings(): Promise<ProtocolSettings> {
    return {
      kuta: await this.getKutas(),
      grahaDrishti: await this.getDrishtiMatches(),
      rashiDrishti: await this.getRashiDrishtiMatches(),
    };
  }

  async getPPCutoff() {
    const key = 'pp_cutoff';
    let value = await this.redisGet(key);
    if (!isNumeric(value) || value < 1) {
      const result = await this.getByKey(key);
      if (result instanceof Object && isNumeric(result.value)) {
        value = result.value;
      }
    }
    return smartCastInt(value, 0);
  }

  async getKutas(skipCache = false): Promise<Map<string, any>> {
    const cKey = 'kuta_variants';
    const stored = skipCache ? null : await this.redisGet(cKey);
    const isStored = stored instanceof Object;
    let settingValue = {};
    if (!isStored) {
      const data = await this.getByKey('kuta_variants');
      settingValue = data instanceof Object ? data.value : {};
      if (Object.keys(settingValue).length > 5) {
        this.redisSet(cKey, settingValue);
      }
    } else {
      settingValue = stored;
    }
    return new Map(Object.entries(settingValue));
  }

  async getDrishtiMatches(): Promise<Map<string, number[]>> {
    const data = await this.getByKey('graha__drishti');
    const settingValue = data instanceof Object ? data.value : {};
    const entries = settingValue.map(row => [row.key, row.aspects]);
    return new Map(entries);
  }

  async getRashiDrishtiMatches(): Promise<Map<number, number[]>> {
    const data = await this.getByKey('rashi__drishti');
    const settingValue = data instanceof Object ? data.value : {};
    const entries = settingValue.map(row => [row.sign, row.aspects]);
    return new Map(entries);
  }

  async getPairedVocabs(useDefaultOpts = false, resetOpts = false) {
    const key = 'paired_vocabs';

    const skipStored = useDefaultOpts && !resetOpts;
    const data = await this.getByKey(key);
    if (
      data instanceof Object &&
      data.value instanceof Array &&
      data.value.length > 0
    ) {
      if (useDefaultOpts) {
        const settingDTO = {
          value: defaultPairedTagOptionSets,
          modifiedAt: new Date(),
        } as CreateSettingDTO;
        if (!skipStored) {
          const { _id } = data;
          this.updateSetting(_id, settingDTO);
        }
      }
      return useDefaultOpts ? defaultPairedTagOptionSets : data.value;
    } else {
      const settingDTO = {
        key,
        type: 'custom',
        value: defaultPairedTagOptionSets,
        createdAt: new Date(),
        modifiedAt: new Date(),
      } as CreateSettingDTO;
      const setting = new this.settingModel(settingDTO);
      setting.save();
      return settingDTO.value;
    }
  }

  // post a single Setting
  async addSetting(createSettingDTO: CreateSettingDTO): Promise<Setting> {
    const newSetting = new this.settingModel(createSettingDTO);
    return newSetting.save();
  }
  // post a single Setting
  async delete(settingID: string): Promise<string> {
    let returnId = '';
    const result = await this.settingModel.findByIdAndDelete(settingID);
    if (result instanceof Object) {
      const { _id } = result;
      if (_id) {
        returnId = _id;
      }
    }
    return returnId;
  }
  // Edit Setting details
  async updateSetting(
    settingID,
    createSettingDTO: CreateSettingDTO,
  ): Promise<Setting> {
    const settingDTO = {
      ...createSettingDTO,
      modifiedAt: new Date(),
    } as CreateSettingDTO;
    const updatedSetting = await this.settingModel.findByIdAndUpdate(
      settingID,
      settingDTO,
      { new: true },
    );
    return updatedSetting;
  }

  async updateSettingByKey(
    key = '',
    createSettingDTO: CreateSettingDTO,
    resetCache = false,
  ) {
    let setting = null;
    let message = '';
    const matchedSetting = await this.getByKey(key);
    const exists =
      matchedSetting instanceof Object &&
      Object.keys(matchedSetting).includes('key');
    if (exists) {
      let value = createSettingDTO.value;
      if (
        createSettingDTO.type === 'preferences' &&
        createSettingDTO.value instanceof Array
      ) {
        value = createSettingDTO.value.map(row => {
          const { prompt, versions } = row;
          const newVersions =
            versions instanceof Array && versions.length > 0
              ? versions.map((v, vi) => {
                  let { text } = v;
                  if (vi === 0 && v.lang === 'en' && notEmptyString(prompt)) {
                    text = prompt;
                  }
                  return { ...v, text };
                })
              : [];
          return { ...row, versions: newVersions };
        });
      }
      setting = await this.updateSetting(extractDocId(matchedSetting), {
        ...createSettingDTO,
        value,
      });
      if (setting) {
        message = 'Setting has been updated successfully';
        this.clearCacheByKey(key);
      }
    } else {
      const settingDTO = {
        ...createSettingDTO,
        key,
      };
      setting = await this.addSetting(settingDTO);
      if (setting) {
        message = 'Setting has been created successfully';
      }
    }
    if (resetCache && setting instanceof Object) {
      this.redisSet(key, createSettingDTO.value);
    }
    return { message, setting };
  }

  async getFlags(skipCache = false) {
    let flags = defaultFlags;
    const cKey = 'flags';
    const stored = skipCache ? null : await this.redisGet(cKey);
    if (stored instanceof Array && stored.length > 0) {
      return stored;
    } else {
      const setting = await this.getByKey('flags');
      if (setting) {
        if (setting.value instanceof Array && setting.value.length > 0) {
          flags = setting.value;
          this.redisSet(cKey, flags);
        }
      }
    }
    return flags;
  }

  async getFlagInfo(key = '') {
    const flags = await this.getFlags();
    const flag = flags.find(fl => fl.key === key);
    const defaultFlag = {
      key: '',
      type: 'boolean',
      defaultValue: false,
      range: [],
      options: [],
      valid: false,
    };
    return flag instanceof Object ? { ...flag, valid: true } : defaultFlag;
  }

  async minPassValue() {
    let minValue = -3;
    const likeability = await this.getFlagInfo('likeability');
    if (likeability.range instanceof Array && likeability.range.length > 1) {
      minValue = likeability.range[0];
    }
    return minValue;
  }

  async swipeMemberRepeatInterval(
    overrideMins = -1,
    resetCache = false,
  ): Promise<number> {
    let value = 720;
    if (overrideMins < 1) {
      const cKey = 'members__repeat_interval';
      if (!resetCache) {
        const cached = await this.redisGet(cKey);
        if (isNumeric(cached)) {
          const intVal = smartCastInt(cached, 0);
          if (intVal > 0) {
            value = intVal;
          }
        }
      } else {
        const setting = await this.getByKey(cKey);
        if (setting instanceof Object) {
          const intVal = smartCastInt(setting.value, 0);
          if (intVal > 0) {
            value = intVal;
            this.redisSet(cKey, value);
          }
        }
      }
    } else {
      value = overrideMins;
    }
    return value;
  }

  async enforcePaidMembershipLogic(resetCache = false): Promise<boolean> {
    let value = false;
    let hasCached = false;
    const cKey = 'members__enforce_paid_logic';
    if (!resetCache) {
      const cached = await this.redisGet(cKey);
      if (cached === true || cached === false) {
        value = cached;
        hasCached = true;
      }
    }
    if (!hasCached) {
      const setting = await this.getByKey(cKey);
      if (setting instanceof Object) {
        value = setting.value === true;
      }
    }
    return value;
  }

  async deviceVersions(skipCache = false): Promise<DeviceVersion[]> {
    const cKey = 'device_versions';
    const versions = await this.fetchCachedSetting(cKey, skipCache);
    if (versions instanceof Array && versions.length > 0) {
      return versions.filter(row => row instanceof Object);
    } else {
      return defaultDeviceVersions;
    }
  }

  async deviceVersion(key = '', skipCache = false): Promise<DeviceVersion> {
    const versions = await this.deviceVersions(skipCache);
    if (versions instanceof Array && versions.length > 0) {
      let version = versions.find(v => v.key === key);
      if (!version) {
        const endKey = '__' + key;
        version = versions.find(v => v.key.endsWith(endKey));
      }
      if (version instanceof Object) {
        return { ...version, valid: true };
      }
    }
    return { key: '', name: '', version: '', forceUpdate: false, valid: false };
  }

  async saveDeviceVersions(
    versions: DeviceVersionDTO[],
  ): Promise<DeviceVersion[]> {
    const key = 'device_versions';
    if (versions instanceof Array && versions.length > 0) {
      const value = versions.filter(row => row instanceof Object);
      if (value.length > 0) {
        const createDTO = {
          key,
          value,
        } as CreateSettingDTO;
        const result = await this.updateSettingByKey(key, createDTO);
        return result.setting.value;
      }
    }
    return [];
  }

  async getProtocol(itemID: string) {
    return await this.protocolModel.findById(itemID);
  }

  async matchProtocolSetting(
    itemID: string,
    settingKey = '',
    defaultVal = null,
  ) {
    const protocol = await this.getProtocol(itemID);
    let hasProtocol = false;
    if (protocol instanceof Object) {
      hasProtocol = true;
      const value = this.matchSettingInProtocol(protocol, settingKey);
      return { hasProtocol: true, protocol, value };
    }
    return { hasProtocol, protocol, value: defaultVal };
  }

  matchSettingInProtocol(protocol, settingKey = '', defaultVal = null) {
    const { settings } = protocol;
    if (settings instanceof Array) {
      const settingRow = settings.find(s => s.key === settingKey);
      if (settingRow instanceof Object) {
        return settingRow.value;
      }
    }
    return defaultVal;
  }

  async getProtocolSetting(itemID: string, settingKey = '', defaultVal = null) {
    const { value } = await this.matchProtocolSetting(
      itemID,
      settingKey,
      defaultVal,
    );
    return value;
  }

  async getProtocolCustomOrbs(itemID: string) {
    const { value, protocol, hasProtocol } = await this.matchProtocolSetting(
      itemID,
      'custom_orbs',
      false,
    );
    if (hasProtocol) {
      if (value) {
        const { settings } = protocol;
        if (settings instanceof Array) {
          const settingRow = settings.find(s => s.key === 'customOrbs');
          if (
            settingRow instanceof Object &&
            settingRow.value instanceof Array
          ) {
            return settingRow.value;
          }
        }
      }
    }
    return [];
  }

  async getProtcols(userID = null) {
    const mp: Map<string, any> = new Map();
    const userNotMatched = userID === '-';
    if (!userNotMatched && notEmptyString(userID, 8)) {
      mp.set('user', userID);
    }
    if (userNotMatched) {
      return [];
    } else {
      const criteria = Object.fromEntries(mp.entries());
      return await this.protocolModel
        .find(criteria)
        .select({ __v: 0 })
        .populate({
          path: 'user',
          select: {
            identifier: 1,
            roles: 1,
            fullName: 1,
            nickName: 1,
            active: 1,
          },
        });
    }
  }

  async saveProtcol(protocolDTO: ProtocolDTO, id = '') {
    let result: any = null;
    if (notEmptyString(id, 8)) {
      const updated = { ...protocolDTO, modifiedAt: new Date() };
      await this.protocolModel.findByIdAndUpdate(id, updated);
      result = await this.protocolModel.findById(id);
    } else {
      const protocol = new this.protocolModel(protocolDTO);
      result = await protocol.save();
    }
    return result;
  }

  async getRuleSet(ruleID = '') {
    return await this.predictiveRuleSetModel.findById(ruleID);
  }

  async saveRuleSet(id = '', colRef = '', ruleIndex = 0, ruleSet: RuleSetDTO) {
    const protocol = await this.protocolModel.findById(id);
    const result: any = { valid: false, protocol: null, matches: [] };
    if (protocol instanceof Object) {
      const protocolObj = protocol.toObject();
      const { collections } = protocolObj;
      if (collections instanceof Array && collections.length > 0) {
        const colIndex = collections.findIndex(col => col.type === colRef);
        const collection = collections[colIndex];
        if (collection instanceof Object) {
          if (Object.keys(collection).includes('rules')) {
            if (ruleIndex < collection.rules.length) {
              collection.rules[ruleIndex] = ruleSet;
            } else if (ruleIndex === 0) {
              collection.rules.push(ruleSet);
            }
          }
        }
      }
      const saved = await this.protocolModel.findByIdAndUpdate(id, protocolObj);
      result.item = ruleSet;
      result.valid = saved instanceof Object;
    }
    return result;
  }

  async savePredictiveRuleSet(ruleSetDTO: PredictiveRuleSetDTO, id = '') {
    let result: any = null;
    if (ruleSetDTO.type === 'panchapakshi') {
      this.clearCacheByKey('pp_active_rules');
      this.clearCacheByKey('pp_cutoff');
    }
    if (notEmptyString(id, 8)) {
      const updated = { ...ruleSetDTO, modifiedAt: new Date() };
      await this.predictiveRuleSetModel.findByIdAndUpdate(id, updated);
      result = await this.predictiveRuleSetModel.findById(id);
    } else {
      const predictiveRuleSet = new this.predictiveRuleSetModel(ruleSetDTO);
      result = await predictiveRuleSet.save();
    }
    return result;
  }

  async savePredictiveRulesActive(
    items: IdBoolDTO[],
    clearPPActiveRulesCache = false,
  ) {
    const rows: any[] = [];
    if (items.length > 0) {
      if (clearPPActiveRulesCache) {
        this.clearCacheByKey('pp_active_rules');
      }
      for (const row of items) {
        const updated = await this.predictiveRuleSetModel.findByIdAndUpdate(
          row.id,
          { active: row.value },
        );
        if (updated._id.toString() === row.id) {
          rows.push(row);
        }
      }
    }
    return rows;
  }

  async deletePredictiveRuleSet(id = '', userID = '', isAdmin = false) {
    const result: any = { valid: false, deleted: false, item: null };
    if (notEmptyString(id, 16)) {
      const rule = await this.predictiveRuleSetModel.findById(id);
      if (rule instanceof Object) {
        result.item = rule;
        result.valid = true;
        if (isAdmin || rule.user === userID) {
          const deleted = await this.predictiveRuleSetModel.deleteOne({
            _id: id,
          });
          if (deleted.ok) {
            result.deleted = true;
          }
        }
      }
    }
    return result;
  }

  async getRuleSets(
    filterRef = null,
    activeOnly = false,
    filterByUser = true,
  ): Promise<PredictiveRuleSet[]> {
    const filterByType = !filterByUser && notEmptyString(filterRef, 3);
    const byUsers = filterByUser && filterRef instanceof Array;
    const byUser = filterByUser && !byUsers && notEmptyString(filterRef, 16);
    const filter: Map<string, any> = new Map();
    if (filterByUser) {
      if (byUsers) {
        if (filterRef.length > 0) {
          filter.set('user', { $in: filterRef });
        }
      } else if (byUser) {
        filter.set('user', filterRef);
      }
    } else if (filterByType) {
      filter.set('type', filterRef);
    }
    if (activeOnly) {
      filter.set('active', true);
    }
    const criteria = Object.fromEntries(filter);
    const items = await this.predictiveRuleSetModel.find(criteria);
    return items;
  }

  async getRuleSetsByType(
    type = '',
    activeOnly = true,
  ): Promise<PredictiveRuleSet[]> {
    return await this.getRuleSets(type, activeOnly, false);
  }

  async getPPRules(): Promise<PPRule[]> {
    const key = 'pp_active_rules';
    const stored = await this.redisGet(key);
    let rules: any[] = [];
    if (stored instanceof Array && stored.length > 0) {
      rules = stored;
    } else {
      const items = await this.getRuleSetsByType('panchapakshi');
      if (items instanceof Array && items.length > 0) {
        rules = items.filter(rs => {
          return rs.conditionSet.conditionRefs.length > 0;
        });
        this.redisSet(key, rules, 24 * 60 * 60);
      }
    }
    return rules.map(mapPPRule);
  }

  async getKotaChakraScoreData(skipCache = false): Promise<any> {
    const key = 'kota_cakra_scores';
    const cKey = [key, 1].join('_');
    const stored = skipCache ? await this.redisGet(cKey) : null;
    const isValidResult = (value: any = null) => {
      const keys = value instanceof Object ? Object.keys(value) : [];
      return (
        keys.includes('scores') &&
        value.scores instanceof Array &&
        value.scores.length > 1
      );
    };
    let result: any = null;
    let hasScores = false;
    if (stored instanceof Object) {
      hasScores = isValidResult(stored);
      if (hasScores) {
        result = stored;
      }
    }
    if (!hasScores) {
      const data = await this.getByKey(key);
      const { value } = data;
      hasScores = isValidResult(value);
      if (hasScores) {
        result = value;
        this.redisSet(cKey, value);
      }
    }
    return hasScores ? result : {};
  }

  async getKotaChakraScoreSet(): Promise<KotaCakraScoreSet> {
    const ruleData = await this.getKotaChakraScoreData();
    return new KotaCakraScoreSet(ruleData);
  }

  async sbcOffset(skipCache = false): Promise<number> {
    const key = 'sbc_score';
    const stored = skipCache ? null : await this.redisGet(key);
    let isStored = false;
    let offset = 0;
    if (stored instanceof Object) {
      if (Object.keys(stored).includes('offset')) {
        offset = smartCastFloat(stored.offset, 0);
        isStored = true;
      }
    }
    if (!isStored) {
      const data = await this.getByKey(key);
      const { value } = data;
      if (Object.keys(value).includes('offset')) {
        offset = smartCastFloat(value.offset, 0);
        this.redisSet(key, value.offset);
      }
    }
    return offset;
  }

  async fetchCachedSetting(
    key = '',
    skipCache = false,
    minSize = 2,
  ): Promise<any> {
    const stored = skipCache ? null : await this.redisGet(key);
    let isStored = false;
    let settingValue = null;
    const isValid = (obj: any = null) =>
      obj instanceof Object && Object.keys(obj).length >= minSize;
    if (stored instanceof Object) {
      if (isValid(stored)) {
        settingValue = stored;
        isStored = true;
      }
    }
    if (!isStored) {
      const data = await this.getByKey(key);
      const { value } = data;
      if (isValid(value)) {
        settingValue = value;
        this.redisSet(key, value);
      }
    }
    return settingValue;
  }

  async synastryOrbs(skipCache = false): Promise<{ [key: string]: number }> {
    const key = 'synastry_orbs';
    return await this.fetchCachedSetting(key, skipCache, 2);
  }

  async p2Scores(skipCache = false) {
    const key = 'p2_scores';
    return await this.fetchCachedSetting(key, skipCache, 1);
  }

  async customCompatibilitySettings(kutaDictMap: any = null) {
    const kutaSet = await this.getKutaSettings();
    const kcScoreSet = await this.getKotaChakraScoreSet();
    const orbMap = await this.synastryOrbs();
    const p2Scores = await this.p2Scores();
    const dictMap: Map<string, string> =
      kutaDictMap instanceof Map ? kutaDictMap : new Map();
    return {
      kutaSet,
      kcScoreSet,
      orbMap,
      p2Scores,
      dictMap,
    };
  }

  async resetCustomSettingsCache(): Promise<boolean> {
    this.synastryOrbs(true);
    this.getKotaChakraScoreData(true);
    return true;
  }

  async deleteProtocol(id = '') {
    const item = await this.protocolModel.findById(id);
    if (!notEmptyString(id, 8)) {
      await this.protocolModel.findByIdAndDelete(id);
    }
    return item;
  }
}
