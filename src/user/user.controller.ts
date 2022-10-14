import {
  Controller,
  Get,
  Res,
  Req,
  HttpStatus,
  Post,
  Body,
  Put,
  Query,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import * as Redis from 'ioredis';
import { MailerService } from '@nest-modules/mailer';
import { UserService } from './user.service';
import { MessageService } from '../message/message.service';
import { SettingService } from '../setting/setting.service';
import { GeoService } from '../geo/geo.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import {
  validEmail,
  notEmptyString,
  isNumeric,
  validISODateString,
  isString,
  validLocationParameter,
} from '../lib/validators';
import {
  arrayHead,
  smartCastFloat,
  smartCastInt,
  toStartRef,
} from '../lib/converters';
import { Request } from 'express';
import {
  fromBase64,
  match6DigitsToken,
  toBase64,
  tokenTo6Digits,
} from '../lib/hash';
import { mailDetails, maxResetMinutes, webBaseUrl } from '../.config';
import * as bcrypt from 'bcrypt';
import {
  extractDocId,
  extractSimplified,
  extractObjectAndMerge,
  hashMapToObject,
  storeInRedis,
  extractFromRedisClient,
  extractFromRedisMap,
  objectToMap,
  extractObjectAndMergeRaw,
} from '../lib/entities';
import roleValues, { filterLikeabilityKey } from './settings/roles';
import paymentValues from './settings/payments-options';
import countryValues from './settings/countries';
import surveyList from './settings/survey-list';
import { Role } from './interfaces/role.interface';
import { EditStatusDTO } from './dto/edit-status.dto';
import { PaymentOption } from './interfaces/payment-option.interface';
import { RemoveStatusDTO } from './dto/remove-status.dto';
import { CountryOption } from './interfaces/country-option.interface';
import { AstrologicService } from '../astrologic/astrologic.service';
import { SurveyItem } from './interfaces/survey-item';
import { SnippetService } from '../snippet/snippet.service';
import { Snippet } from '../snippet/interfaces/snippet.interface';
import { FeedbackService } from '../feedback/feedback.service';
import { ProfileDTO } from './dto/profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  deleteFile,
  deleteUserFiles,
  generateFileName,
  matchFileTypeAndMime,
  mediaPath,
  uploadMediaFile,
} from '../lib/files';
import { PreferenceDTO } from './dto/preference.dto';
import {
  addExtraPanchangaNumValues,
  simplifyChart,
} from '../astrologic/lib/member-charts';
import { MediaItemDTO } from './dto/media-item.dto';
import {
  filterLikeabilityContext,
  mapReciprocalLikeability,
  UserFlagSet,
} from '../lib/notifications';
import { isValidObjectId, Model } from 'mongoose';
import { ActiveStatusDTO } from './dto/active-status.dto';
import {
  dateAgoString,
  isoDateToMilliSecs,
  matchJdAndDatetime,
  matchLocaleJulianDayData,
} from '../astrologic/lib/date-funcs';
import {
  cleanSnippet,
  mapSimplePreferenceOption,
} from './settings/simple-preferences';
import { FacetedItemDTO } from '../setting/dto/faceted-item.dto';
import {
  analyseAnswers,
  normalizedToPreference,
  normalizeFacetedPromptItem,
  filterMapSurveyByType,
  mergePsychometricFeedback,
  summariseJungianAnswers,
  big5FacetedScaleOffset,
  compareJungianPolarities,
  extractSurveyScoresByType,
} from '../setting/lib/mappers';
import { PublicUserDTO } from './dto/public-user.dto';
import { User } from './interfaces/user.interface';
import { mergeProgressSets } from '../astrologic/lib/settings/progression';
import { IdSetDTO } from './dto/id-set.dto';
import {
  basicSetToFullChart,
  Chart,
  extractPanchangaData,
} from '../astrologic/lib/models/chart';
import { PaymentDTO } from './dto/payment.dto';
import { toWords } from '../astrologic/lib/helpers';
import permissionValues from './settings/permissions';
import {
  buildCurrentTrendsData,
  mergeCurrentTrendsWithSnippets,
} from '../astrologic/lib/calc-orbs';
import { LogoutDTO } from './dto/logout.dto';
import { ResetDTO } from './dto/reset.dto';
import { EmailParamsDTO } from './dto/email-params.dto';
import { filterByLang, matchValidLang } from '../lib/mappers';
import { Kuta } from '../astrologic/lib/kuta';
import {
  calcPreviousMidnightJd,
  julToDateParts,
} from '../astrologic/lib/julian-date';
import { PPRule } from '../astrologic/lib/settings/pancha-pakshi';
import { locStringToGeo } from '../astrologic/lib/converters';
import { calcKotaChakraScoreData } from '../astrologic/lib/settings/kota-values';
import { GeoLoc } from '../astrologic/lib/models/geo-loc';
import { CreateFeedbackDTO } from '../feedback/dto/create-feedback.dto';
import { toSimplePositions } from '../astrologic/lib/core';
import {
  process5PRulesWithPeaks,
  processTransitionData,
} from '../astrologic/lib/calc-5p';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private settingService: SettingService,
    private snippetService: SnippetService,
    private astrologicService: AstrologicService,
    private geoService: GeoService,
    private feedbackService: FeedbackService,
    private dictionaryService: DictionaryService,
    private readonly redisService: RedisService,
    private mailerService: MailerService,
  ) {}

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

  // add a user
  @Post('create')
  async addUser(@Res() res, @Body() createUserDTO: CreateUserDTO) {
    let msg = 'N/A';
    let userData = {};
    let valid = false;
    const existing = await this.userService.findOneByEmail(
      createUserDTO.identifier,
      false,
    );
    if (existing) {
      msg = 'A user with this email address already exists';
    } else {
      if (validEmail(createUserDTO.identifier)) {
        const roles = await this.getRoles();
        const user = await this.userService.addUser(createUserDTO, roles);
        if (user) {
          msg = 'User has been created successfully';
          userData = extractSimplified(user, ['password']);
          valid = true;
        } else {
          msg = 'Could not create a new user';
        }
      } else {
        msg = 'Please enter a valid email address';
      }
    }
    return res.status(HttpStatus.OK).json({
      message: msg,
      user: userData,
      valid,
    });
  }

  @Get('email-match/:email')
  async emailMatch(@Res() res, @Param('email') email) {
    const user = await this.userService.findOneByEmail(email);
    const valid = user instanceof Object;
    const userObj = valid
      ? {
          nickName: user.nickName,
          fullName: user.fullName,
          identifier: user.identifier,
          roles: user.roles,
          active: user.active,
        }
      : {};
    const result = {
      valid,
      user: userObj,
    };
    return res.json(result);
  }

  /*
    #mobile
    #admin
    #astrotesting
  */
  @Post('auth-user')
  async authUser(@Res() res, @Body() createUserDTO: CreateUserDTO) {
    let msg = 'N/A';
    let userData: any = {};
    let valid = false;
    const existing = await this.userService.findOneByEmailOrSocial(
      createUserDTO,
      false,
    );
    const { deviceToken } = createUserDTO;
    if (existing) {
      const userID = extractDocId(existing);
      const loginDt = await this.userService.registerLogin(userID, deviceToken);
      valid = existing.active;
      const user = extractSimplified(existing, ['password', '__v', 'coords']);
      const ud: Map<string, any> = new Map(Object.entries(user));
      ud.set('login', loginDt);
      const charts = await this.astrologicService.getChartsByUser(
        userID,
        0,
        1,
        true,
      );
      if (charts.length > 0) {
        ud.set('chart', simplifyChart(charts[0]));
      }
      const flagItems = await this.feedbackService.getAllUserInteractions(
        userID,
        3 / 12,
      );
      const flags =
        flagItems instanceof Object
          ? flagItems
          : { to: [], from: [], likeability: { to: [], from: [] } };
      const { to, from, likeability } = flags;
      ud.set('flags', {
        to,
        from,
      });
      ud.set('likeability', {
        to: likeability.to,
        from: likeability.from,
      });
      const feedbackItems = await this.getFacetedFeedbackItems('jungian', true);
      const surveyData = await this.userService.matchSurveyData(
        userID,
        user,
        feedbackItems,
      );
      ud.set('surveys', surveyData);
      if (createUserDTO.deviceToken) {
        const tokenRefs = ud.get('deviceTokens');
        const dvs = tokenRefs instanceof Array ? tokenRefs : [];
        if (dvs.indexOf(createUserDTO.deviceToken) < 0) {
          dvs.push(createUserDTO.deviceToken);
          ud.set('deviceTokens', dvs);
        }
        if (ud.has('deviceToken')) {
          ud.delete('deviceToken');
        }
      }
      userData = hashMapToObject(ud);
    }
    if (!valid) {
      if (notEmptyString(createUserDTO.identifier, 5)) {
        const user = await this.userService.addUser(createUserDTO);
        if (user) {
          msg = 'User has been created successfully';
          userData = extractSimplified(user, ['password', 'coords']);
          valid = true;
        } else {
          msg = 'Could not create a new user';
        }
      } else {
        msg = 'Please enter a valid email address or other valid identifier';
      }
    }
    const status = valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json({
      message: msg,
      user: userData,
      valid,
    });
  }

  @Get('ip')
  getIp(@Res() res, @Req() req) {
    let ip = 'x.x.x.x';
    let valid = false;
    let userAgent = '';
    if (req instanceof Object && req.headers instanceof Object) {
      const { headers } = req;
      const headerKeys = Object.keys(headers);
      ip = headerKeys.includes('x-real-ip')
        ? headers['x-real-ip'].toString()
        : '0.0.0.0';
      valid = true;
      userAgent = headerKeys.includes('user-agent')
        ? headers['user-agent']
        : '';
    }
    return res.json({ valid, ip, userAgent });
  }

  @Put('logout/:userID')
  async logOut(
    @Res() res,
    @Param('userID') userID,
    @Body() logoutDTO: LogoutDTO,
  ) {
    let status = HttpStatus.NOT_FOUND;
    const result = {
      valid: false,
      ts: 0,
      hasDeviceToken: false,
      deviceTokenMatched: false,
      login: null,
      loginTs: 0,
    };
    if (notEmptyString(userID) && isValidObjectId(userID)) {
      const { identifier, deviceToken } = logoutDTO;
      const logoutResult = await this.userService.registerLogout(
        userID,
        identifier,
        deviceToken,
      );

      result.ts = logoutResult.ts;
      result.valid = logoutResult.matched;
      result.hasDeviceToken = logoutResult.hasDeviceToken;
      result.deviceTokenMatched = logoutResult.deviceTokenMatched;
      result.login = logoutResult.login;
      result.loginTs = logoutResult.loginTs;
      if (result.valid) {
        status = HttpStatus.OK;
      }
    }
    return res.status(status).json(result);
  }

  /*
    #mobile
    #admin
    #astrotesting
  */
  @Put('edit/:userID')
  async editUser(
    @Res() res,
    @Param('userID') userID,
    @Body() createUserDTO: CreateUserDTO,
  ) {
    const roles = await this.getRoles();
    const { user, keys, message } = await this.userService.updateUser(
      userID,
      createUserDTO,
      roles,
    );
    const hasUser = user instanceof Object;
    const status = hasUser
      ? keys.length > 0
        ? HttpStatus.OK
        : HttpStatus.NOT_ACCEPTABLE
      : HttpStatus.NOT_FOUND;

    return res.status(status).json({
      message,
      user,
      editedKeys: keys,
    });
  }

  /*
    #mobile
    #admin
    #astrotesting
  */
  @Put('edit-password/:userID')
  async editUserPassword(
    @Res() res,
    @Param('userID') userID,
    @Body() createUserDTO: CreateUserDTO,
  ) {
    const roles = await this.getRoles();
    const filteredEntries = Object.entries(createUserDTO).filter(entry =>
      ['password', 'oldPassword'].includes(entry[0]),
    );
    let msg = 'invalid payload';
    let status = HttpStatus.NOT_ACCEPTABLE;
    let reason = 'invalid_input';
    let valid = false;
    let exists = false;
    if (filteredEntries.length === 2) {
      valid = true;
      const filteredDTO = Object.fromEntries(filteredEntries) as CreateUserDTO;
      const {
        user,
        keys,
        message,
        reasonKey,
      } = await this.userService.updateUser(userID, filteredDTO, roles);
      msg = message;
      reason = reasonKey;
      const hasUser = user instanceof Object;
      if (hasUser) {
        exists = true;
      }
      status = hasUser
        ? keys.length > 0
          ? HttpStatus.OK
          : HttpStatus.NOT_ACCEPTABLE
        : HttpStatus.NOT_FOUND;
    }
    const baseResult = {
      message: msg,
      reason,
      valid,
      exists,
    };
    return res.status(status).json(baseResult);
  }

  /*
    #mobile
    #admin
    #astrotesting
  */
  @Get('list/:start?/:limit?')
  async getUsersByCriteria(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Req() request: Request,
  ) {
    start = smartCastInt(start, 0);
    limit = smartCastInt(limit, 100);
    const { query } = request;
    const criteria = query instanceof Object ? query : {};
    const criteriaKeys = Object.keys(criteria);
    let activeOnly = true;
    if (criteria.admin) {
      activeOnly = false;
    }
    const users = await this.userService.list(
      start,
      limit,
      criteria,
      activeOnly,
    );
    let grandTotal = -1;
    let activeTotal = -1;
    let total = 0;
    const hasFilterKeys =
      criteriaKeys.filter(k => ['totals', 'admin'].includes(k) === false)
        .length > 0;
    if (criteriaKeys.includes('totals')) {
      activeTotal = await this.userService.count({}, true);
      grandTotal = await this.userService.count({}, true);
    }
    if (!hasFilterKeys && grandTotal > 0) {
      total = grandTotal;
    } else {
      total = await this.userService.count(criteria, activeOnly);
    }
    return res.status(HttpStatus.OK).json({
      start,
      total,
      grandTotal,
      activeTotal,
      perPage: limit,
      num: users.length,
      items: users,
    });
  }

  @Get('list-csv/:startDt?/:endDt?')
  async listCsv(
    @Res() res,
    @Param('startDt') startDt,
    @Param('endDt') endDt,
    @Req() request: Request,
  ) {
    const startDate = validISODateString(startDt) ? startDt : dateAgoString(92);
    const endDate = validISODateString(endDt) ? endDt : '';
    const hasEndDate = notEmptyString(endDate);
    const { query } = request;
    const filter: Map<string, any> = new Map();
    const activeOnly = true;
    const createdRange = hasEndDate
      ? {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      : {
          $gte: new Date(startDate),
        };
    filter.set('createdAt', createdRange);
    if (query instanceof Object) {
      Object.entries(query).map(([k, v]) => {
        filter.set(k, v);
      });
    }
    const criteria = Object.fromEntries(filter.entries());
    const users = await this.userService.list(0, 10, criteria, activeOnly);
    return res.status(HttpStatus.OK).json({
      num: users.length,
      items: users,
    });
  }

  @Post('basic-by-ids')
  async getBasicDetailsByIds(@Res() res, @Body() idSet: IdSetDTO) {
    const { uids, userID } = idSet;
    const data = await this.userService.getBasicByIds(uids, userID);
    res.json(data);
  }

  @Get('basic-by-id/:uid')
  async getBasicDetailsById(@Res() res, @Param('uid') uid: string) {
    const userID = isValidObjectId(uid) ? uid : '';
    const user =
      userID.length > 12 ? await this.userService.getBasicById(userID) : null;

    const result =
      user instanceof Object ? { valid: true, ...user } : { valid: false };
    res.json(result);
  }

  /**
   * Optional query string parameters include:
   * roles: comma-separated list of role keys
    fullName: fuzzy match full name from beginning
    nickName: fuzzy match display name from beginning
    usearch: fuzzy match on fullName, nickName or email
    gender: f/m
    age: comma-separated age range, e.g. 20,30
    near: [lat],[lng],[km] e.g. 77,28,5 => within a 5km radius of 77º E 28º N
    baseurl/members/0/100?gender=f&age=30,40&near=19.2726,76.38363,50
    #mobile
    #admin
   * @param res 
   * @param start 
   * @param limit 
   * @param request 
   * @returns 
   */
  @Get('members/:start?/:limit?')
  async listMembers(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Req() request: Request,
  ) {
    const { query } = request;
    const userId = query instanceof Object ? query.user : '';
    const userStatus = await this.userService.memberActive(userId);
    const items = userStatus.active
      ? await this.fetchMembers(start, limit, query)
      : [];
    return res.status(userStatus.status).json(items);
  }

  async fetchMembers(
    start = 0,
    limit = 100,
    queryRef = null,
    fullChart = false,
  ) {
    const query: any = queryRef instanceof Object ? queryRef : {};
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    let simpleMode = 'basic';
    let ayanamshaKey = 'true_citra';
    const queryKeys = Object.keys(query);
    if (queryKeys.includes('profile') === false) {
      query.profile = 1;
    }
    let filterIds = [];
    let hasFilterIds = false;
    //const notLiked = queryKeys.includes('notliked');
    let hasUser =
      queryKeys.includes('user') &&
      notEmptyString(query.user, 16) &&
      isValidObjectId(query.user);
    const userId = hasUser ? query.user : '';
    let refChart = null;
    let hasRefChart = false;
    const context = queryKeys.includes('context') ? query.context : '';
    // only applies to liked, superliked and matched listings
    const startOffset =
      queryKeys.includes('start') && isNumeric(query.start)
        ? smartCastInt(query.start)
        : 0;
    const hasContext = hasUser && notEmptyString(context, 2);
    // assign parameters by context
    const params = hasContext ? filterLikeabilityContext(context) : query;
    const isLikeContext = hasContext && context !== 'search';
    let repeatInterval = -1;
    const searchMode = context === 'search';
    const filteredForUser = hasUser && searchMode;
    const paramKeys = Object.keys(params);
    const filterPartnerAgeRangePrefs =
      queryKeys.includes('ar') && smartCastInt(query.ar, 0) > 0;
    // filter ids by members who have liked or superliked the referenced user
    // legacy block for liked, liked1, liked2, mutual etc parameters. Now assigned via context
    const likeabilityKeys = [
      'liked',
      'liked1',
      'liked2',
      'passed',
      'likeability',
      'likability',
    ];
    if (hasUser && paramKeys.some(k => likeabilityKeys.includes(k))) {
      const matchedKey = paramKeys.find(k => likeabilityKeys.includes(k));
      const filterByLikeability = notEmptyString(matchedKey);
      if (filterByLikeability) {
        const { refNum, gte } = filterLikeabilityKey(matchedKey);
        const startDate = toStartRef(params[matchedKey]);
        const mutual =
          paramKeys.includes('mutual') && smartCastInt(params.mutual, 0) > 0;
        const unrated =
          !mutual &&
          paramKeys.includes('unrated') &&
          smartCastInt(params.unrated, 0) > 0;
        const mutualMode = mutual ? 1 : unrated ? -1 : 0;
        const flags = await this.feedbackService.fetchByLikeability(
          query.user,
          startDate,
          refNum,
          gte,
          mutualMode,
        );
        const skipMutuality =
          (!mutual && !unrated) || ['liked', 'liked2'].includes(context);
        filterIds =
          flags instanceof Array
            ? flags
                .filter(
                  fl =>
                    skipMutuality ||
                    (mutual && fl.isMutual) ||
                    (unrated && !fl.isMutual),
                )
                .map(fl => fl.user)
            : [];
        hasFilterIds = true;

        if (startOffset > 0) {
          arrayHead(filterIds, startOffset);
        }
      }
    }
    // end of like parameter matching
    if (queryKeys.includes('mode') && notEmptyString(query.mode)) {
      switch (query.mode) {
        case 'simple':
        case 'complete':
          simpleMode = query.mode;
          break;
      }
    }
    if (queryKeys.includes('ayanamsha') && notEmptyString(query.ayanamsha)) {
      switch (query.ayanamsha) {
        case 'raw':
        case 'tropical':
          ayanamshaKey = query.ayanamsha;
          break;
      }
    }

    let notFlags = [];
    let trueFlags = [];
    // Filter search swipe listing
    let userAge = -1;
    const userInfo = hasUser
      ? await this.userService.getBasicById(userId)
      : null;
    hasUser = userInfo instanceof Object;
    userAge = hasUser ? userInfo.age : -1;
    if (hasUser) {
      const chartObj = await this.astrologicService.getUserBirthChart(userId);
      if (chartObj instanceof Model) {
        refChart = new Chart(chartObj.toObject());
        refChart.setAyanamshaItemByKey('true_citra');
        hasRefChart = refChart.grahas.length > 6;
      }
    }
    if (hasContext && searchMode) {
      //notFlags = ['like', 'superlike', 'passed3'];
      const enforcePaidMembership = await this.settingService.enforcePaidMembershipLogic();

      const currQueryKeys = Object.keys(query);
      if (userAge > 17 && filterPartnerAgeRangePrefs) {
        query.ageRange = userAge;
      }
      if (hasUser) {
        if (userInfo.hasAgeRange && currQueryKeys.includes('age') === false) {
          query.age = userInfo.ageRange;
        }
        const hasGendersOverride = currQueryKeys.includes('gender');
        if (userInfo.genders.length > 0 && !hasGendersOverride) {
          query.gender = userInfo.genders;
        } else if (hasGendersOverride) {
          const targetGenders = query.gender
            .split(',')
            .filter(letter => letter.length > 0);
          query.gender = targetGenders;
        }
        if (userInfo.gender) {
          query.genders = userInfo.gender;
        }
      }
      if (queryKeys.includes('near') === false && hasUser) {
        let maxDistKm = userInfo.maxDistance;
        if (queryKeys.includes('km') && isNumeric(query.km)) {
          const km = smartCastFloat(query.km, 0);
          if (km > 0) {
            maxDistKm = km;
          }
        }
        query.near = [userInfo.geo.lat, userInfo.geo.lng, maxDistKm].join(',');
      }
      const isPaidMember =
        hasUser && enforcePaidMembership
          ? userInfo.isPaidMember
          : !enforcePaidMembership;
      notFlags = ['passed3'];
      if (isPaidMember) {
        notFlags.push('notliked');
      } else {
        notFlags.push('notliked2');
      }

      const overrideMins = queryKeys.includes('rpm')
        ? smartCastInt(query.rpm, 0)
        : -1;
      repeatInterval = await this.settingService.swipeMemberRepeatInterval(
        overrideMins,
      );
    } else {
      const notFlagStr = queryKeys.includes('nf')
        ? query.nf
        : queryKeys.includes('not')
        ? query.not
        : '';
      const trueFlagStr = queryKeys.includes('tf')
        ? query.tf
        : queryKeys.includes('flags')
        ? query.not
        : '';
      notFlags = notEmptyString(notFlagStr) ? notFlagStr.split(',') : [];
      trueFlags = notEmptyString(trueFlagStr) ? trueFlagStr.split(',') : [];
    }
    if (context === 'liked') {
      trueFlags = ['liked1'];
    } else if (context === 'superliked') {
      trueFlags = ['liked2'];
    }
    const preFetchFlags = notFlags.length > 0 || trueFlags.length > 0;
    // fetch inclusions and exclusions by context
    const {
      userFlags,
      excludedIds,
      includedIds,
    } = await this.feedbackService.fetchFilteredUserInteractions(
      userId,
      notFlags,
      trueFlags,
      preFetchFlags,
      searchMode,
      repeatInterval,
    );
    if (
      includedIds instanceof Array &&
      trueFlags.length > 0 &&
      includedIds.length > 0
    ) {
      filterIds = includedIds;
      hasFilterIds = true;
    }
    const queryParams = hasFilterIds ? { ...query, ids: filterIds } : query;

    if (hasUser) {
      excludedIds.push(userId);
    }
    const users = await this.userService.members(
      startInt,
      limitInt,
      queryParams,
      excludedIds,
      filteredForUser,
    );
    /*  const users = this.userService.filterByPreferences(
      data,
      query,
      prefOptions,
    ); */
    const otherUserIds = preFetchFlags ? users.map(u => u._id) : [];
    const items = [];
    const flags: UserFlagSet =
      hasUser && !preFetchFlags
        ? await this.feedbackService.getAllUserInteractions(
            userId,
            1,
            otherUserIds,
          )
        : userFlags;
    const jungianRef = extractSurveyScoresByType(userInfo);
    const kutaDict = await this.dictionaryService.getKutaDict();
    const customSettings = await this.settingService.customCompatibilitySettings(
      kutaDict,
    );
    for (const user of users) {
      if (hasRefChart) {
        const extraData = await this.astrologicService.expandUserWithChartData(
          user,
          refChart,
          customSettings,
          fullChart,
          ayanamshaKey,
          simpleMode,
        );
        const likeability = mapReciprocalLikeability(
          flags,
          user._id.toString(),
        );
        const jungian = extractSurveyScoresByType(user);
        const personality = compareJungianPolarities(jungianRef, jungian);
        if (extraData.hasChart) {
          items.push({ ...extraData, likeability, personality });
        }
      }
    }

    if (isLikeContext) {
      items.sort((a, b) => {
        if (a.likeability.to.modifiedAt && b.likeability.to.modifiedAt) {
          return (
            isoDateToMilliSecs(b.likeability.to.modifiedAt) -
            isoDateToMilliSecs(a.likeability.to.modifiedAt)
          );
        } else {
          return -100000;
        }
      });
    } else {
      items.sort((a, b) => (b.hasChart ? 1 : -1));
    }
    return items;
  }

  /*
    #mobile
    #admin
  */
  @Get('likes/:userID/:startRef?/:mode?/:fullMode')
  async getLikesToUser(
    @Res() res,
    @Param('userID') userID,
    @Param('startRef') startRef,
    @Param('mode') mode,
    @Param('fullMode') fullMode,
  ) {
    const monthRef = /^\d+m$/i;
    const startDate = isNumeric(startRef)
      ? parseFloat(startRef)
      : monthRef.test(startRef)
      ? parseInt(startRef.replace(/[^0-9]\./, ''), 10) / 12
      : startRef;
    const returnFullObjects = fullMode === 'full';
    const { refNum, gte } = filterLikeabilityKey(mode);
    const flags = await this.feedbackService.fetchByLikeability(
      userID,
      startDate,
      refNum,
      gte,
    );
    if (!returnFullObjects) {
      return res.status(HttpStatus.OK).json(flags);
    } else {
      const items = await this.fetchMembers(0, flags.length, {
        ids: flags.map(f => f.user),
        user: userID,
      });
      return res.json(items);
    }
  }

  /*
    Fetch role options and merge related payment options
    #mobile
    #admin    
  */
  @Get('role-options')
  async listRoles(@Res() res) {
    const paymentOpts = await this.getPaymentOptions();
    const roles = await this.getRoles();
    const data = roles.map(role => {
      const payOpts = paymentOpts.filter(
        po => po.key.split('__').shift() == role.key,
      );
      return { ...role, payOpts };
    });
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #mobile
    #admin
    Fetch a particular user using ID
  */
  @Get('payment-options')
  async listPaymentOptions(@Res() res) {
    const items = await this.getPaymentOptions();
    return res.status(HttpStatus.OK).json(items);
  }

  @Get('country-options')
  async listCountryOptions(@Res() res) {
    const data = {
      valid: countryValues instanceof Array,
      items: countryValues,
    };
    return res.status(HttpStatus.OK).json(data);
  }

  /*
  #admin
  #mobile
  */
  @Get('permissions')
  async listPermissions(@Res() res) {
    const permData = await this.settingService.getPermissions();
    const permObj = permData instanceof Object ? permData : {};
    const matchPermName = (key: string) => {
      const row = permissionValues.find(pm => pm.key === key);
      return row instanceof Object ? row.name : toWords(key);
    };
    const entryToRow = ([key, val], isLimit = false) => {
      const value = isLimit ? val : typeof val === 'boolean' ? val : false;
      return {
        key,
        name: matchPermName(key),
        value,
      };
    };
    const entryToPerm = entry => entryToRow(entry, false);
    const entryToLimit = entry => entryToRow(entry, true);
    const limits = Object.entries(permObj)
      .filter(entry => typeof entry[1] === 'number')
      .map(entryToLimit);

    const repeatInterval = await this.settingService.swipeMemberRepeatInterval();
    limits.push({
      key: 'members__repeat_interval',
      name: 'Swipe member repeat interval (minutes)',
      value: repeatInterval,
    });
    const items = Object.entries(permObj)
      .filter(entry => typeof entry[1] !== 'number')
      .map(entryToPerm);
    return res.status(HttpStatus.OK).json({
      items,
      limits,
    });
  }

  /*
  #admin
  #mobile
  */
  @Get('max-upload/:userID')
  async maxUpload(@Res() res, @Param('userID') userID) {
    const uploadData = await this.maxUploadByUser(userID);
    return res.status(HttpStatus.OK).json(uploadData);
  }

  /*
  #admin
  #mobile
  */
  async maxUploadByUser(userID: string) {
    const permData = await this.settingService.getPermissionData(true);
    return await this.userService.fetchMaxImages(userID, permData);
  }

  /*
    #admin
    #mobile
    Fetch a particular user using ID
  */
  @Get('item/:userID/:mode?')
  async memberDeatils(
    @Res() res,
    @Param('userID') userID,
    @Param('mode') mode,
  ) {
    const result = await this.getMember(userID, mode);
    const status = result.valid ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json(result);
  }

  async getMember(userID = '', mode = '') {
    const result: Map<string, any> = new Map();
    result.set('user', null);
    const validUserId = userID.length === 24 && /^[0-9a-f]+$/i.test(userID);
    const user = validUserId ? await this.userService.getUser(userID) : null;
    let errorMsg = '';
    const valid = user instanceof Model;
    if (!valid) {
      errorMsg = 'User does not exist!';
    }
    const userObj: any = user instanceof Model ? user.toObject() : {};
    result.set('valid', valid);
    const strMode = notEmptyString(mode, 1) ? mode : '';
    const postProcessPreferences = ['full', 'detailed'].includes(strMode);
    const addUserChart = ['member', 'chart', 'full'].includes(strMode);
    if (postProcessPreferences && user instanceof Object) {
      if (user.preferences instanceof Array && user.preferences.length > 0) {
        if (user instanceof Model) {
          const userObj: any = user.toObject();
          const {
            preferences,
            facetedAnswers,
            facetedAnalysis,
          } = await this.settingService.processPreferences(userObj.preferences);
          result.set('preferences', preferences);
          result.set('facetedAnswers', facetedAnswers);
          result.set('facetedAnalysis', facetedAnalysis);
          delete userObj.preferences;
        }
      }
    }
    if (valid && addUserChart) {
      const chart = await this.astrologicService.getUserBirthChart(userID);
      if (chart instanceof Object) {
        const chartObj = simplifyChart(chart);
        userObj.chart = chartObj;
      }
    }
    result.set('user', userObj);
    if (notEmptyString(errorMsg)) {
      result.set('msg', errorMsg);
    }
    return Object.fromEntries(result.entries());
  }

  /**
   * #mobile
   * #admin
   * Fetch preference options
   */
  @Get('survey-list/:mode?')
  async listSurveys(@Res() res, @Param('mode') mode) {
    const setting = await this.settingService.getByKey('survey_list');
    const addMultiScaleInfo = mode === 'info';
    let data: Array<SurveyItem> = [];
    if (!setting) {
      data = surveyList;
    } else {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    if (addMultiScaleInfo) {
      const multiscaleTypes = await this.settingService.surveyMultiscales();
      data = data.map(item => {
        let scaleParams: any = {};
        const { multiscales } = item;
        if (notEmptyString(multiscales)) {
          const multiscaleOptions = multiscaleTypes.find(
            item => item.key === multiscales,
          );
          if (multiscaleOptions instanceof Object) {
            scaleParams = multiscaleOptions;
          }
        }
        return { ...item, scaleParams };
      });
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /**
   * #mobile
   * #admin
   * Fetch multiscale preference options
   */
  @Get('survey-multiscales')
  async getSurveryMultiscales(@Res() res) {
    const dataWithOptions = await this.settingService.surveyMultiscales();
    return res.status(HttpStatus.OK).json(dataWithOptions);
  }

  /**
   * #mobile
   * #admin
   * Fetch preferences by key
   */
  async getPreferencesByKey(surveyKey = '', key = '') {
    const prefOpts = await this.settingService.getPreferenceOptions(surveyKey);
    const data = { valid: false, num: 0, items: [], isFaceted: false };
    const mapLocalised = v => {
      return {
        lang: v.lang,
        text: v.text,
      };
    };
    if (prefOpts instanceof Array) {
      data.num = prefOpts.length;
      data.valid = data.num > 0;
      data.items = [];
      for (const po of prefOpts) {
        const comboKey = [key, po.key].join('__');
        const vData = await this.snippetService.getSnippetByKeyStart(comboKey);
        const hasVersions = vData.snippet instanceof Object;
        const hasOptionVersions = vData.options.length > 0;
        const isFaceted = isString(po.domain);
        if (isFaceted && !data.isFaceted) {
          data.isFaceted = true;
        }
        const versions = {
          prompt: hasVersions ? vData.snippet.values.map(mapLocalised) : [],
          options: {},
        };
        const optMap = new Map<string, Array<any>>();
        if (hasOptionVersions) {
          vData.options.forEach(optSet => {
            const vals = optSet.values
              .filter(v => v instanceof Object)
              .map(mapLocalised);
            optMap.set(optSet.key.split('_option_').pop(), vals);
          });
          versions.options = Object.fromEntries(optMap.entries());
        }
        const item = isFaceted
          ? normalizeFacetedPromptItem(po, versions, hasVersions)
          : {
              ...po,
              hasVersions,
              versions,
            };
        data.items.push(item);
      }
    }
    return data;
  }

  /*
    #mobile
    #admin
    Fetch preference options
  */
  @Get('preferences/:key?/:lang?/:refresh?')
  async listPreferenceOptions(
    @Res() res,
    @Param('key') key,
    @Param('lang') lang,
    @Param('refresh') refresh,
  ) {
    const showAll = key === 'all';
    const cached = smartCastInt(refresh, 0) < 1;
    const surveyKey = notEmptyString(key, 4) ? key : 'preference_options';
    const cacheKey = ['preferences_listing', surveyKey].join('_');
    const stored = cached ? await this.redisGet(cacheKey) : null;

    const validStored = stored instanceof Object && stored.valid;
    const hasLang =
      notEmptyString(lang, 2) && ['all', '--'].includes(lang) === false;
    let data: any = {
      valid: false,
      cached: false,
    };
    if (validStored) {
      data = { ...stored, cached: true };
    } else {
      data = await this.assemblePreferenceOptions(key, surveyKey, showAll);
      if (data.valid && data.items instanceof Array) {
        this.redisSet(cacheKey, data);
      }
    }
    if (hasLang) {
      const isSurvey =
        data.items.length > 0 &&
        data.items.some(item => {
          const itemKeys = Object.keys(item);
          if (itemKeys.includes('domain') && itemKeys.includes('hasVersions')) {
            return item.hasVersions;
          } else {
            return false;
          }
        });
      if (isSurvey) {
        data.items = data.items.map(item => {
          const {
            key,
            prompt,
            domain,
            subdomain,
            inverted,
            versions,
            hasVersions,
          } = item;
          let localisedPrompt = prompt;
          if (hasVersions && versions instanceof Array) {
            localisedPrompt = filterByLang(versions, lang);
          }
          return { key, prompt: localisedPrompt, domain, subdomain, inverted };
        });
        data.options = data.options.map(opt => {
          const { key, values } = opt;
          const value = filterByLang(values, lang);
          return { key, value };
        });
        data.lang = lang;
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  async assemblePreferenceOptions(key = '', surveyKey = '', showAll = false) {
    let data: any = { valid: false, cached: false };
    if (showAll) {
      const keys = await this.settingService.getPreferenceKeys();
      const surveys: Map<string, any> = new Map();
      const keyNums: Map<string, number> = new Map();
      for (const sk of keys) {
        const sd = await this.getPreferencesByKey(sk, sk);
        if (sd.valid) {
          surveys.set(sk, sd.items);
          keyNums.set(sk, sd.items.length);
        }
      }
      data.surveys = Object.fromEntries(surveys.entries());
      data.valid = surveys.size > 0;
      data.keyNums = Object.fromEntries(keyNums.entries());
    } else {
      const isSimple = key === 'simple';
      const refKey = isSimple ? '' : key;
      const refSurveyKey = isSimple ? 'preference_options' : surveyKey;
      data = await this.getPreferencesByKey(refSurveyKey, refKey);
      if (isSimple) {
        data.items = data.items.map(mapSimplePreferenceOption);
      }
      if (data.isFaceted) {
        const options = await this.snippetService.getByCategory('faceted');
        if (options instanceof Array) {
          data.options = options.map(cleanSnippet);
          const subkeys = ['minus2', 'minus1', 'neutral', 'plus1', 'plus2'];
          const assignSeq = op => {
            const endKey = op.key.split('_').pop();
            let subNum = subkeys.indexOf(endKey) + 1;
            if (subNum < 1 && isNumeric(endKey)) {
              subNum = parseInt(endKey, 10);
            }
            return subNum;
          };
          data.options.sort((a, b) => assignSeq(a) - assignSeq(b));
        }
      }
    }
    return data;
  }

  /**
   * #mobile
   * #admin
   * Fetch most active users
   */
  @Get('most-active/:numWeeks?')
  async getMostActive(@Res() res, @Param('numWeeks') numWeeks) {
    const numWeeksInt = isNumeric(numWeeks) ? smartCastInt(numWeeks, 1) : 2;
    const result = await this.feedbackService.rankByActivity([], numWeeksInt);
    return res.status(HttpStatus.OK).json(result);
  }

  /**
   * #mobile
   * #admin
   * Fetch most active users
   */
  @Get('most-liked/:daysAgo?/:start?/:limit?')
  async getMostLiked(
    @Res() res,
    @Param('daysAgo') daysAgo,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const daInt = isNumeric(daysAgo) ? smartCastInt(daysAgo, 0) : 14;
    const daysAgoInt = daInt > 0 ? daInt : 14;
    const startInt = isNumeric(start) ? smartCastInt(start, 0) : 0;
    const limitInt = isNumeric(limit) ? smartCastInt(limit, 0) : 0;
    const result = await this.feedbackService.rankByLikeability(
      [],
      daysAgoInt,
      startInt,
      limitInt,
    );
    return res.status(HttpStatus.OK).json(result);
  }

  /*
    #mobile
    #admin
  */
  @Post('login')
  async login(@Res() res, @Body() loginDTO: LoginDTO) {
    const data = await this.processLogin(loginDTO);
    const status = data.validIdentifier
      ? HttpStatus.OK
      : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json(data);
  }
  /*
    #mobile
  */
  @Post('member-login')
  async memberLogin(@Res() res, @Body() loginDTO: LoginDTO) {
    const data = await this.processLogin(loginDTO, 'member');
    const status = data.validIdentifier
      ? HttpStatus.OK
      : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json(data);
  }

  /*
    #mobile
    #admin
  */
  async processLogin(loginDTO: LoginDTO, mode = 'editor') {
    const user = await this.userService.findOneByEmail(loginDTO.email, false);
    const userData = new Map<string, any>();
    const validIdentifier = notEmptyString(loginDTO.email, 7);
    let valid = false;
    let exists = false;
    const isMemberLogin = mode === 'member';
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      valid = user.active;
      exists = true;
      if (!valid) {
        userData.set('msg', 'Inactive account');
        userData.set('key', 'inactive');
      }
      if (user.password) {
        if (valid) {
          valid = bcrypt.compareSync(loginDTO.password, user.password);

          if (!valid) {
            userData.set('msg', 'Invalid password');
          }
        }
      } else {
        valid = false;
        userData.set('msg', 'Invalid password');
      }
      if (valid) {
        const { matchedObj } = extractObjectAndMergeRaw(
          user,
          userData,
          ['password', 'status', 'token'],
          true,
        );

        const userID = extractDocId(user);
        const { deviceToken, geo } = loginDTO;
        const loginDt = await this.userService.registerLogin(
          userID,
          deviceToken,
          geo,
        );
        userData.set('login', loginDt);
        if (notEmptyString(deviceToken, 5)) {
          const tokenRefs = userData.get('deviceTokens');
          const dvs = tokenRefs instanceof Array ? tokenRefs : [];
          if (dvs.indexOf(deviceToken) < 0) {
            dvs.push(deviceToken);
            userData.set('deviceTokens', dvs);
          }
          if (userData.has('deviceToken')) {
            userData.delete('deviceToken');
          }
        }
        const flagItems = await this.feedbackService.getAllUserInteractions(
          userID,
          3 / 12,
        );
        const flags = flagItems instanceof Object ? flagItems : [];
        userData.set('flags', flags);
        const chart = await this.astrologicService.getUserBirthChart(userID);
        if (chart instanceof Object) {
          const chartObj = isMemberLogin
            ? simplifyChart(chart, 'true_citra', 'basic')
            : chart;
          if (isMemberLogin) {
            addExtraPanchangaNumValues(chartObj, 'true_citra');
          }
          userData.set('chart', chartObj);
        }
        if (matchedObj.preferences instanceof Array) {
          const feedbackItems = await this.getFacetedFeedbackItems(
            'jungian',
            true,
          );
          const surveyData = await this.userService.matchSurveyData(
            userID,
            matchedObj,
            feedbackItems,
          );
          if (Object.keys(surveyData).length > 0) {
            userData.set('surveys', surveyData);
          }
        }
      }
    }
    userData.set('validIdentifier', validIdentifier);
    userData.set('exists', exists);
    userData.set('valid', valid);
    return hashMapToObject(userData);
  }

  /*
    #mobile
    #admin
    Edit user status to update role with optional payment data
  */
  @Post('edit-status')
  async editStatus(@Res() res, @Body() editStatusDTO: EditStatusDTO) {
    const data = await this.editStatusItem(editStatusDTO);
    return res.json(data);
  }

  @Put('add-boost/:userID/:num/:days?')
  async applyBoostStatus(
    @Res() res,
    @Param('userID') userID,
    @Param('num') num,
    @Param('days') days,
    @Body() paymentDTO: PaymentDTO,
  ) {
    const numBoosts = isNumeric(num) ? smartCastInt(num, 1) : 1;
    const numDays = isNumeric(days) ? smartCastInt(num, 7) : 7;
    const futureTs = new Date().getTime() + numDays * 24 * 60 * 60 * 1000;
    const expiryDate = new Date(futureTs);
    const editStatusDTO = {
      user: userID,
      role: 'active',
      paymentOption: 'booster',
      payment: paymentDTO,
      expiryDate,
    };
    const data = await this.editStatusItem(editStatusDTO, numBoosts);
    return res.json(data);
  }

  @Put('reset-likes/:userID')
  async resetLikes(
    @Res() res,
    @Param('userID') userID,
    @Body() resetDTO: ResetDTO,
  ) {
    const { ts, value } = resetDTO;
    const result = { valid: false, ts: -1 };
    if (isNumeric(ts)) {
      let tsInt = smartCastInt(ts);
      const likeIntVal = isNumeric(value) ? smartCastInt(value, 1) : 1;
      if (tsInt < 0) {
        tsInt = new Date().getTime();
      }
      result.ts = await this.userService.updateLikeStartTs(
        userID,
        0,
        likeIntVal,
        tsInt,
      );
      result.valid = result.ts >= 0;
    }
    return res.json(result);
  }

  async editStatusItem(editStatusDTO: EditStatusDTO, numBoosts = 0) {
    const roles = await this.getRoles();
    const paymentOptions = await this.getPaymentOptions();
    const { user, role, paymentOption, payment, expiryDate } = editStatusDTO;
    let expiryDt = null;
    if (expiryDate) {
      expiryDt = new Date(expiryDate);
    }
    const matchedPO = paymentOptions.find(po => po.key === paymentOption);
    let data: any = { valid: false };
    if (roles.some(r => r.key === role)) {
      const userData = await this.userService.updateStatus(
        user,
        role,
        roles,
        matchedPO,
        payment,
        expiryDt,
        numBoosts,
      );
      let userObj = userData instanceof Model ? userData.toObject() : {};
      const keys = Object.keys(userObj);
      if (keys.includes('password')) {
        userObj = extractSimplified(userObj, [
          'coords',
          'password',
          'preferences',
          'profiles',
          'contacts',
          'placenames',
        ]);
        delete userObj.geo._id;
      }
      data = {
        valid: keys.length > 3,
        ...userObj,
      };
    }
    return data;
  }

  /*
    #mobile
    #admin
  */
  @Put('activate-status/:userID')
  async activeStatus(
    @Res() res,
    @Param('userID') userID,
    @Body() activeStatusDTO: ActiveStatusDTO,
  ) {
    const { active } = activeStatusDTO;
    const data = {
      valid: false,
      user: null,
    };
    let HStatus = HttpStatus.NOT_ACCEPTABLE;
    if (isValidObjectId(userID)) {
      const expiryDt = new Date(
        new Date().getTime() + 10 * 365.25 * 24 * 60 * 60 * 1000,
      );
      const activeStatus = active === true;
      const userData = await this.userService.updateActive(
        userID,
        activeStatus,
        'user_action',
        expiryDt,
        activeStatus,
      );
      if (
        userData instanceof Object &&
        notEmptyString(userData.identifier, 5)
      ) {
        data.user = userData;
        data.valid = true;
        HStatus = HttpStatus.OK;
      }
    }
    return res.status(HStatus).json(data);
  }
  /*
    #mobile
    #admin
  */
  @Put('toggle-active/:userID')
  async toggleActive(
    @Res() res,
    @Param('userID') userID,
    @Body() activeStatusDTO: ActiveStatusDTO,
  ) {
    const { active, reason, expiryDate, removeBlockHistory } = activeStatusDTO;
    let expiryDt = null;
    let HStatus = HttpStatus.NOT_ACCEPTABLE;
    if (expiryDate) {
      expiryDt = new Date(expiryDate);
    }
    const userData = await this.userService.updateActive(
      userID,
      active,
      reason,
      expiryDt,
      removeBlockHistory === true,
    );
    if (userData instanceof Object) {
      HStatus = HttpStatus.OK;
    }
    const keys = Object.keys(userData);
    let userObj: any = {};
    if (keys.length > 0) {
      userObj = extractSimplified(userData, [
        'coords',
        'password',
        'preferences',
        'profiles',
        'contacts',
        'placenames',
      ]);
      delete userObj.geo._id;
    }
    const data = {
      valid: keys.length > 3,
      ...userObj,
    };
    return res.status(HStatus).json(data);
  }

  @Get('current-trends')
  async getRelativePositions(@Res() res, @Query() query) {
    const params = query instanceof Object ? query : {};
    const paramKeys = Object.keys(params);
    let dt = '';
    if (paramKeys.includes('dt')) {
      dt = params.dt;
    }
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    let status = HttpStatus.NOT_ACCEPTABLE;
    let cid = '';
    if (paramKeys.includes('cid')) {
      cid = params.cid;
    }
    if (paramKeys.includes('email')) {
      cid = await this.astrologicService.getChartIDByEmail(params.email);
    } else if (paramKeys.includes('user')) {
      cid = await this.astrologicService.getChartIDByUser(params.user);
    }
    let showMode = 'matches';
    if (paramKeys.includes('mode')) {
      showMode = params.mode;
    }
    const hasGeo = paramKeys.includes('loc')
      ? validLocationParameter(params.loc)
      : false;
    const geo = hasGeo ? locStringToGeo(params.loc) : null;
    const showLuckyTimes = hasGeo
      ? paramKeys.includes('lucky')
        ? smartCastInt(params.lucky, 0) > 0
        : false
      : false;
    const showBirthChart = paramKeys.includes('bc')
      ? smartCastInt(params.bc, 0) > 0
      : false;
    const showPanchanga = paramKeys.includes('pc')
      ? smartCastInt(params.pc, 0) > 0
      : false;
    const dateMode = paramKeys.includes('date') ? params.date : 'simple';
    const langRef =
      paramKeys.includes('lang') && notEmptyString(params.lang, 1)
        ? params.lang
        : 'en';
    const lang = matchValidLang(langRef, 'en');
    let rsMap: Map<string, any> = new Map();
    rsMap.set('valid', false);
    rsMap.set('jd', jd);
    rsMap.set('unix', julToDateParts(jd).unixTimeInt);
    rsMap.set('dtUtc', dtUtc);
    const ayanamsaKey =
      paramKeys.includes('aya') &&
      notEmptyString(params.aya, 5) &&
      params.aya !== 'tropical'
        ? params.aya
        : 'true_citra';
    const tropicalMode = paramKeys.includes('tropical')
      ? smartCastInt(params.tropical, 0) > 0
      : false;

    if (isValidObjectId(cid)) {
      const chartData = await this.astrologicService.getChart(cid);

      if (chartData instanceof Model) {
        const cDataObj = chartData.toObject();
        const chart = new Chart(cDataObj);
        status = HttpStatus.OK;
        chart.setAyanamshaItemByKey(ayanamsaKey);
        rsMap.set('valid', true);
        const ctData = await buildCurrentTrendsData(
          jd,
          chart,
          showMode,
          ayanamsaKey,
          tropicalMode,
          true,
          dateMode,
        );
        const matches = ctData.get('matches');
        if (showBirthChart) {
          const varaNum = chart.vara.num;
          cDataObj.numValues.push({ key: 'vara', value: varaNum });
          const moonNak = chart.moon.nakshatra27;
          cDataObj.numValues.push({ key: 'moonNak', value: moonNak });
          rsMap.set(
            'birthChart',
            simplifyChart(cDataObj, ayanamsaKey, 'simple'),
          );
        }
        if (showPanchanga) {
          const pd = extractPanchangaData(chart);
          rsMap.set('panchanga', Object.fromEntries(pd.entries()));
        }
        if (matches instanceof Array) {
          const keys = matches.map(m => {
            const [cat, sub] = m.snippetKey;
            return [cat, sub].join('__');
          });
          const snippets = await this.snippetService.getByKeys(
            keys,
            'current_trends',
          );
          const fullMatches = matches.map(m =>
            mergeCurrentTrendsWithSnippets(m, snippets, lang),
          );
          if (fullMatches.length > 0) {
            fullMatches.sort((a, b) => a.days - b.days);
            ctData.set('aspectMatches', fullMatches);
          }
        }
        if (showLuckyTimes) {
          const rules = await this.settingService.getPPRules();
          const customCutoff = await this.settingService.getPPCutoff();
          //const ppData = await calcLuckyTimes(chart, jd, geo, rules, customCutoff, dateMode, false);
          //const luckyData = Object.fromEntries(ppData.entries());
          //const luckyDataPrev = await this.fetchLuckyTimes(false, chart, jd, geo, rules, customCutoff, dateMode);

          //const luckyData = await this.fetchLuckyTimes(true, chart, jd, geo, rules, customCutoff, dateMode);
          //ctData.set('luckyTimes', luckyData);
          //ctData.set('luckyTimesPrev', luckyDataPrev);
          const luckyData = await this.fetchLuckyTimes24h(
            chart,
            jd,
            geo,
            rules,
            customCutoff,
            dateMode,
          );
          ctData.set('luckyTimes', Object.fromEntries(luckyData.entries()));
          /* const tzData = await this.geoService.fetchTzData(geo, julToDateParts(jd).isoDate, true);
          
          const nowDt = new Date(julToDateParts(jd).unixMillisecs);
          nowDt.setHours(0,0,0);
          const serverTsOffset = (nowDt.getTimezoneOffset() * 60);
          const midnightTs = Math.round((Math.round(nowDt.getTime() / 1000) - tzData.tzOffset - serverTsOffset) / 60) * 60; */
          //ctData.set('tzData', {...tzData, midnightTs });
        }
        const kcScoreSet = await this.settingService.getKotaChakraScoreSet();
        const geoLoc = geo instanceof Object ? geo : chart.geo;
        const transitChart = await this.astrologicService.getCurrentChartObj(
          dtUtc,
          geoLoc,
        );
        transitChart.setAyanamshaItemByKey('true_citra');
        const kc = calcKotaChakraScoreData(
          chart,
          transitChart,
          kcScoreSet,
          true,
        );
        rsMap.set(
          'transitLngs',
          transitChart.bodies.map(gr => {
            const { key, longitude } = gr;
            return { key, longitude };
          }),
        );
        rsMap.set('kotaCakra', kc.total);
        //rsMap.set('transitGrahas', transitChart);
        rsMap = new Map([...rsMap, ...ctData]);
      } else {
        status = HttpStatus.NOT_FOUND;
      }
    }
    const allowedKeys = [
      'jd',
      'valid',
      'dtUtc',
      'unix',
      'ayanamshas',
      'lngMode',
      'aspectMatches',
      'kotaCakra',
      'transitLngs',
      'birthChart',
      'panchanga',
    ];
    if (['charts', 'all'].includes(showMode)) {
      allowedKeys.push('current', 'progress', 'birth');
    }
    if (['all'].includes(showMode)) {
      allowedKeys.push(
        'ranges',
        'currentToBirth',
        'currentToProgressed',
        'progressedToBirth',
        'progressedToProgressed',
      );
    }
    if (showLuckyTimes) {
      allowedKeys.push('valid', 'luckyTimes', 'luckyTimesPrev', 'tzData');
    }
    return res
      .status(status)
      .json(
        Object.fromEntries(
          [...rsMap.entries()].filter(entry => allowedKeys.includes(entry[0])),
        ),
      );
  }

  async fetchLuckyTimes24h(
    chart: Chart,
    jd = 0,
    geo: GeoLoc,
    rules: PPRule[],
    cutoff = 0,
    dateMode = 'simple',
  ) {
    const result: Map<string, any> = new Map();

    const refDt = julToDateParts(jd).toDate();
    const refDtStr = refDt
      .toISOString()
      .split('.')
      .shift();

    const timeInfo = await this.geoService.fetchTzData(geo, refDtStr);
    const midNightJd = calcPreviousMidnightJd(timeInfo.tzOffset, jd);

    const endJd = midNightJd + 1;
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
      false,
      dateMode,
    );
    const ppKeys = ppData.keys();
    const excludeKeys = [
      'rules',
      'span',
      'yamas1',
      'yamas2',
      'ruleJds',
      'totalMatched',
      'tzOffset',
      'startJd',
      'endJd',
      'unix',
      'jd',
    ];
    for (const ppKey of ppKeys) {
      if (excludeKeys.includes(ppKey) === false) {
        result.set(ppKey, ppData.get(ppKey));
      }
      const span = result.get('spanUnix');
      if (span instanceof Array && span.length > 1) {
        const [start, end] = span;
        result.set('start', start);
        result.set('end', end);
        result.delete('spanUnix');
      }
    }
    return result;
  }

  /* async fetchLuckyTimes24h(
    chart: Chart,
    jd = 0,
    geo: GeoLoc,
    rules: PPRule[],
    customCutoff = 0,
    dateMode = 'simple',
  ) {
    const ltPrev = await this.fetchLuckyTimes(
      false,
      chart,
      jd,
      geo,
      rules,
      customCutoff,
      dateMode,
    );
    const ltCurr = await this.fetchLuckyTimes(
      true,
      chart,
      jd,
      geo,
      rules,
      customCutoff,
      dateMode,
    );
    const tzData = await this.geoService.fetchTzData(
      geo,
      julToDateParts(jd).isoDate,
      true,
    );
    const nowDt = new Date(julToDateParts(jd).unixMillisecs);
    nowDt.setHours(0, 0, 0);
    const serverTsOffset = nowDt.getTimezoneOffset() * 60;
    const midNightTs = Math.round(nowDt.getTime() / 1000);
    const midnightTs =
      Math.round((midNightTs - tzData.tzOffset - serverTsOffset) / 60) * 60;
    const minuteDiff = (midnightTs - ltCurr.minuteStart) / 60;
    const data = {
      minutes: [],
      start: 0,
      end: 0,
      times: [],
      sunrise: 0,
      sunset: 0,
      tzData,
    };
    if (
      ltPrev.minutes instanceof Array &&
      ltCurr.minutes instanceof Array &&
      ltCurr.minutes.length > 360 &&
      ltPrev.minutes.length >= minuteDiff
    ) {
      const remainder = 1440 + minuteDiff;
      const numOffset = 1440 - ltPrev.minutes.length;
      const prevOffset = minuteDiff + numOffset;
      data.minutes = [
        ...ltPrev.minutes.slice(prevOffset, numOffset),
        ...ltCurr.minutes.slice(0, remainder),
      ];
      data.start = midnightTs;
      data.end = data.start + 24 * 60 * 60;
      data.sunrise = ltCurr.start;
      data.sunset = ltCurr.sunset;
      if (ltPrev.times instanceof Array) {
        ltPrev.times.forEach(row => {
          if (row.peak >= data.start && row.peak <= data.end) {
            data.times.push(row);
          }
        });
      }
      if (ltCurr.times instanceof Array) {
        ltCurr.times.forEach(row => {
          if (row.peak >= data.start && row.peak <= data.end) {
            data.times.push(row);
          }
        });
      }
    }
    return data;
  } */

  /* async fetchLuckyTimes(
    current = true,
    chart: Chart,
    jd = 0,
    geo: GeoLoc,
    rules: PPRule[],
    customCutoff = 0,
    dateMode = 'simple',
  ) {
    const { noonJd } = matchLocaleJulianDayData(jd, geo);
    const refNoonJd = current ? noonJd : noonJd - 1;
    const birthKey = [
      chart.jd.toFixed(3),
      chart.geo.lat.toFixed(2),
      chart.geo.lng.toFixed(2),
    ].join('-');
    const ltKey = [
      'lucky-times',
      chart._id,
      birthKey,
      refNoonJd.toFixed(3),
      geo.lat.toFixed(2),
      geo.lng.toFixed(2),
    ].join('-');

    //const refJd = current? jd : jd - 1;
    const stored = await this.redisGet(ltKey);
    const hasStored =
      stored instanceof Object &&
      Object.keys(stored).includes('minutes') &&
      stored.minutes instanceof Array &&
      stored.minutes.length > 720;
    if (hasStored) {
      return stored;
    } else {
      const data = await calcLuckyTimes(
        chart,
        refNoonJd,
        geo,
        rules,
        customCutoff,
        dateMode,
        false,
      );
      if (data instanceof Map) {
        const dataObj = Object.fromEntries(data.entries());
        this.redisSet(ltKey, dataObj);
        return dataObj;
      } else {
        return {
          start: 9,
          sunset: 0,
          end: 0,
          max: 0,
          cutOff: customCutoff,
          minutes: [],
          times: [],
        };
      }
    }
  } */

  /*
    #mobile
  */
  @Get('member-status/:userID/:mode?')
  async memberStatus(@Res() res, @Param('userID') userID, @Param('mode') mode) {
    const data = await this.userService.getUserStatus(userID);
    const keys = Object.keys(data);
    const statusItems =
      keys.includes('status') && data.status instanceof Array
        ? data.status
        : [];
    //const nowTs = new Date().getTime();
    const status = statusItems.filter(st => {
      return st.current;
    });
    return res.status(HttpStatus.OK).json({ ...data, status, mode });
  }

  /*
    #mobile
    #admin
    Remove a role from the status history
  */
  @Post('remove-status')
  async removeStatus(@Res() res, @Body() removeStatusDTO: RemoveStatusDTO) {
    const { user, role } = removeStatusDTO;

    const userData = await this.userService.removeStatus(user, role);
    const data = {
      valid: userData instanceof Object,
      userData,
    };
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #mobile
    #admin
  */
  async matchUserByHash(hash: string, email = '') {
    let idStr = fromBase64(hash);
    let user = null;
    let matched = false;
    // digit mode is for use with the mobile app
    const digitMode = isNumeric(hash) && validEmail(email);
    if (digitMode) {
      user = await this.userService.findOneByEmail(email);
      if (user instanceof Object) {
        const tokenMatches = match6DigitsToken(user.token, hash);
        if (tokenMatches) {
          idStr = [user._id, user.token].join('__');
        }
      }
    }
    if (idStr.includes('__')) {
      const [userID, tsStr] = idStr.split('__');
      const ts = Math.floor(parseFloat(tsStr));
      const currTs = new Date().getTime();
      const tsAgo = currTs - ts;
      const maxTs = maxResetMinutes * 60 * 1000;
      if (tsAgo <= maxTs) {
        if (digitMode) {
          matched = true;
        } else {
          user = await this.userService.findOneByToken(tsStr);
          if (user) {
            const matchedUserId = extractDocId(user);
            matched = matchedUserId === userID;
          }
        }
      }
    }
    return { user, matched };
  }

  /*
    #mobile
  */
  @Get('reset/:hash')
  async resetMatch(@Res() res, @Param('hash') hash) {
    const { user, matched } = await this.matchUserByHash(hash);
    const userData = new Map<string, any>();
    let valid = false;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      if (matched) {
        valid = user.active;
        if (!valid) {
          userData.set('msg', 'Inactive account');
          userData.set('key', 'inactive');
        }
      }
      if (valid) {
        extractObjectAndMerge(user, userData, ['password', 'status']);
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  /*
    #mobile
  */
  @Put('reset-pass/:hash')
  async resetPassword(
    @Res() res,
    @Param('hash') hash,
    @Body() loginDTO: LoginDTO,
  ) {
    const { user, matched } = await this.matchUserByHash(hash, loginDTO.email);
    const userData = new Map<string, any>();
    let valid = false;
    let editedUser = user;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      if (matched) {
        valid = user.active;
        if (!valid) {
          userData.set('msg', 'Inactive account');
          userData.set('key', 'inactive');
        } else {
          const password = loginDTO.password;
          if (password.length > 7) {
            const userID = extractDocId(user);
            const updatedUser = await this.userService.updatePassword(
              userID,
              password,
            );
            if (updatedUser) {
              editedUser = updatedUser;
            }
          }
        }
      }
      if (valid) {
        extractObjectAndMerge(editedUser, userData, [
          'password',
          'status',
          'preferences',
          'coords',
        ]);
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  /*
    #mobile
  */
  async triggerResetRequest(userID: string, @Res() res, webMode = false) {
    const user = await this.userService.requestReset(userID, 'forgotten');
    const data = new Map<string, any>();
    data.set('valid', false);
    if (user) {
      if (notEmptyString(user.token, 6)) {
        const resetLink = '/reset/' + toBase64(userID + '__' + user.token);
        //data.set('token', user.token);
        const resetNumber = tokenTo6Digits(user.token);
        data.set('webMode', webMode);
        if (webMode) {
          data.set('link', resetLink);
        } else {
          data.set('number', resetNumber);
          data.set('reset', true);
        }
        const resetHash = webMode ? resetLink : resetNumber;
        data.set('valid', true);
        const userName = notEmptyString(user.fullName)
          ? user.fullName
          : user.nickName;
        this.messageService.resetMail(user.identifier, userName, resetHash);
      }
    }
    return res.status(HttpStatus.OK).json(hashMapToObject(data));
  }

  /*
    #mobile
  */
  @Put('reset/:userID')
  async reset(@Res() res, @Param('userID') userID) {
    return this.triggerResetRequest(userID, res);
  }

  /*
    #mobile
  */
  @Post('reset-request')
  async resetRequest(@Res() res, @Body() loginDTO: LoginDTO) {
    const user = await this.userService.findOneByEmail(loginDTO.email);
    let userID = '';
    if (user) {
      userID = extractDocId(user);
    }
    if (userID.length > 3) {
      return this.triggerResetRequest(userID, res, true);
    } else {
      return res
        .status(HttpStatus.OK)
        .json({ valid: false, message: 'Not found' });
    }
  }

  /*   @Put('status/:userID/:status')
  async updateStatus(
    @Res() res,
    @Param('userID') userID,
    @Param('status') status,
  ) {
    const user = await this.userService.updateStatus(userID, status);
    let userData = {};
    let message = '';
    if (user) {
      userData = extractSimplified(user, ['password', 'status']);
      message = "User's status has been updated successfully";
    } else {
      message = "User's status has not been updated";
    }
    return res.status(HttpStatus.OK).json({
      message,
      user: userData,
    });
  } */

  async matchRole(key: string) {
    const roles = await this.getRoles();
    let role: Role = {
      key: '',
      name: '',
      overrides: [],
      adminAccess: false,
      appAccess: false,
      permissions: [''],
    };
    const matched = roles.find(r => r.key === key);
    if (matched) {
      role = matched;
    }
    return role;
  }

  async getRoles(): Promise<Array<Role>> {
    const setting = await this.settingService.getByKey('roles');
    let data: Array<Role> = [];
    if (!setting) {
      data = roleValues;
    } else if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    return data;
  }

  /*
    #mobile
  */
  async getPaymentOptions(): Promise<Array<PaymentOption>> {
    const setting = await this.settingService.getByKey('payments');
    let data: Array<PaymentOption> = [];
    if (!setting) {
      data = paymentValues;
    } else if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        data = setting.value.map(st => {
          if (!st.isFallback) {
            st.isFallback = false;
          }
          if (!st.ccodes) {
            st.ccodes = [];
          }
          return st;
        });
      }
    }
    return data;
  }

  /*
    #mobile
    #admin
  */
  async getCountryOptions(): Promise<Array<CountryOption>> {
    const setting = await this.settingService.getByKey('countries');
    let data: Array<CountryOption> = [];
    if (!setting) {
      data = countryValues;
    } else if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    return data;
  }

  /*
    #mobile
  */
  @Put('profile/save/:userID')
  async saveProfile(
    @Res() res,
    @Param('userID') userID,
    @Body() profileDTO: ProfileDTO,
  ) {
    const data = await this.userService.saveProfile(userID, profileDTO);
    return res.json(data);
  }

  /*
    #mobile
    #admin
  */
  @Put('preference/save/:userID')
  async savePreference(
    @Res() res,
    @Param('userID') userID,
    @Body() preferenceDTO: PreferenceDTO,
  ) {
    const data = await this.userService.savePreference(userID, preferenceDTO);
    return res.json(data);
  }

  /*
    #mobile
    #admin
  */
  @Put('preferences/save/:userID')
  async savePreferences(
    @Res() res,
    @Param('userID') userID,
    @Body() preferences: PreferenceDTO[],
  ) {
    const data = await this.userService.savePreferences(userID, preferences);
    let status = HttpStatus.OK;
    if (!data.exists) {
      status = HttpStatus.NOT_FOUND;
    } else if (!data.valid) {
      status = HttpStatus.NOT_ACCEPTABLE;
    }
    return res.status(status).json(data);
  }

  /*
    #mobile
    #admin
  */
  @Put('survey/save/:type/:userID/:lang?/:reset?')
  async saveSurvey(
    @Res() res,
    @Param('type') type,
    @Param('userID') userID,
    @Param('lang') lang,
    @Param('reset') reset,
    @Body() prefs: PreferenceDTO[],
  ) {
    const matchedType = /jung/.test(type) ? 'jungian' : 'faceted';
    const notCached = isNumeric(reset) && smartCastInt(reset, 0) > 0;
    const cached = !notCached;
    const userStatus = await this.userService.memberActive(userID);
    const preferences = prefs.map(pr => {
      const { key, value } = pr;
      const adjustedValue = value - big5FacetedScaleOffset;
      return { key, value: adjustedValue, type: matchedType };
    });
    // remove this later
    //const data = await this.userService.savePreferences(userID, preferences);
    const isJungian = matchedType === 'jungian';
    const matchedLang =
      notEmptyString(lang, 1) && /[a-z][a-z][a-z]?(-[A-Z][A-Z])/.test(lang)
        ? lang
        : 'en';
    const result: any = { valid: false, answers: [], analysis: {} };
    //if (data instanceof Object && data.valid) {
    const { surveys } = await this.settingService.getSurveyData();

    const optType =
      matchedType === 'jungian'
        ? 'jungian_options'
        : 'faceted_personality_options';
    const jungian = surveys.find(sv => sv.key === optType);
    const questions = jungian instanceof Object ? jungian.items : [];
    result.answers = filterMapSurveyByType(preferences, matchedType, questions);
    if (questions.length > 0) {
      await this.userService.saveSurveyAnswersKeyVals(
        userID,
        matchedType,
        prefs,
        questions,
      );
    } else {
      userStatus.status = HttpStatus.NOT_ACCEPTABLE;
    }
    const completed = result.answers.length >= questions.length;
    result.analysis = completed
      ? isJungian
        ? summariseJungianAnswers(result.answers)
        : analyseAnswers(type, result.answers)
      : {};
    if (isJungian) {
      const feedbackItems = await this.getFacetedFeedbackItems(
        'jungian',
        cached,
      );
      const merged = this.userService.mergeSurveyFeedback(
        result.analysis,
        matchedLang,
        feedbackItems,
      );
      result.title = merged.title;
      result.text = merged.text;
      result.letters = merged.letters;
      result.categories = merged.categories;
      result.valid = result.answers.length > 0;
    }
    return res.statsu(userStatus.status).json(result);
  }

  /*
    #mobile
    #admin
  */
  @Put('jungian-type/save/:userID')
  async saveJungianPersonalityCode(
    @Res() res,
    @Param('userID') userID,
    @Body() preferenceDTO: PreferenceDTO,
  ) {
    const { value } = preferenceDTO;
    const result: any = { valid: false, user: null, msg: 'invalid' };
    if (notEmptyString(value, 3)) {
      const correctedValue = value
        .toUpperCase()
        .replace(/[^A-Z]/, '')
        .trim();
      const rgxStr = ['IE', 'SN', 'FT', 'JP']
        .map(pair => ['[', ...pair, ']'].join(''))
        .join('');
      const rgx = new RegExp('^' + rgxStr + '$');
      if (rgx.test(correctedValue)) {
        const prefDTO = {
          key: 'jungian_type',
          value: correctedValue,
          type: 'code',
        } as PreferenceDTO;
        const feedbackItems = await this.getFacetedFeedbackItems(
          'jungian',
          true,
        );
        await this.userService.deleteAnswersByUserAndType(userID, 'jungian');
        const data = await this.userService.savePreference(
          userID,
          prefDTO,
          feedbackItems,
        );
        if (data.valid && data.user instanceof Object) {
          result.valid = true;
          result.user = data.user;
        }
      } else {
        result.msg = 'bad format';
      }
    } else {
      result.msg = 'too short';
    }
    return res.json(result);
  }

  async getFacetedFeedbackItems(
    type = 'faceted',
    cached = true,
  ): Promise<Snippet[]> {
    const subKey = type === 'faceted' ? 'big5' : 'jung';
    const cKey = [subKey, 'feedback_snippets'].join('_');
    const resultKey = [subKey, 'results'].join('_');
    let feedbackItems = [];
    const storedItems = cached ? await this.redisGet(cKey) : null;
    if (storedItems instanceof Array && storedItems.length > 0) {
      feedbackItems = storedItems;
    } else {
      feedbackItems = await this.snippetService.getByCategory(resultKey);
      if (feedbackItems instanceof Array && feedbackItems.length > 5) {
        this.redisSet(cKey, feedbackItems);
      }
    }
    return feedbackItems;
  }

  @Put('faceted-big5/save/:userID/:refresh?')
  async getBig5Faceted(
    @Res() res,
    @Param('userID') userID,
    @Param('refresh') refresh,
    @Body() items: FacetedItemDTO[],
  ) {
    const { valid, responses, analysis } = await this.saveFacetedPromptsByType(
      'faceted',
      items,
      userID,
      refresh,
    );
    return res.send({ valid, responses, analysis });
  }

  @Put('faceted/save/:type/:userID/:refresh?')
  async saveFacetedPrompts(
    @Res() res,
    @Param('type') type,
    @Param('userID') userID,
    @Param('refresh') refresh,
    @Body() items: FacetedItemDTO[],
  ) {
    const { valid, responses, analysis } = await this.saveFacetedPromptsByType(
      type,
      items,
      userID,
      refresh,
    );
    return res.send({ valid, responses, analysis });
  }

  async saveFacetedPromptsByType(
    type = 'faceted',
    items: FacetedItemDTO[] = [],
    userID = '',
    refresh = null,
  ) {
    let responses = [];
    let analysis = {};
    let valid = false;
    const cached = smartCastInt(refresh, 0) < 1;
    if (items instanceof Array) {
      const feedbackItems = await this.getFacetedFeedbackItems(type, cached);
      const preferences = items.map(item => normalizedToPreference(item, type));
      const userData = await this.userService.savePreferences(
        userID,
        preferences,
      );
      if (userData.valid) {
        const big5Data = await this.settingService.analyseFacetedByType(
          type,
          items,
          feedbackItems,
          cached,
        );

        responses = big5Data.responses;
        analysis = big5Data.analysis;

        valid = responses.length > 0;
      }
    }
    return { valid, responses, analysis };
  }

  @Post('test-surveys/:type/:refresh?')
  async testBig4Faceted(
    @Res() res,
    @Param('type') type,
    @Param('refresh') refresh,
    @Body() items: FacetedItemDTO[],
  ) {
    const cached = smartCastInt(refresh, 0) < 1;
    const feedbackItems = await this.getFacetedFeedbackItems(type, cached);
    const {
      responses,
      analysis,
    } = await this.settingService.analyseFacetedByType(
      type,
      items,
      feedbackItems,
      cached,
    );
    return res.send({ responses, analysis });
  }

  @Post('public-save')
  async savePublicUser(
    @Res() res,
    @Body() userData: PublicUserDTO,
    @Query() query,
  ) {
    const publicUser = await this.userService.savePublic(userData);
    const valid = publicUser instanceof Model;
    const params = objectToMap(query);
    const showPsychRaw = params.has('psych') ? params.get('psych') : '1';
    const showPsych = smartCastInt(showPsychRaw, 1) > 0;
    let userObj: any = {};
    let facetedAnswers = [];
    let jungianAnswers = [];
    let facetedAnalysis: any = {};
    let jungianAnalysis: any = {};
    if (valid) {
      const {
        _id,
        nickName,
        identifier,
        useragent,
        dob,
        gender,
        geo,
        preferences,
        modifiedAt,
        createdAt,
      } = publicUser.toObject();
      userObj = {
        _id,
        nickName,
        identifier,
        useragent,
        dob,
        gender,
        geo,
        modifiedAt,
        createdAt,
      };
      if (preferences.length > 0 && showPsych) {
        const prefData = await this.settingService.processPreferences(
          preferences,
        );
        if (prefData.jungianAnswers.length > 0) {
          const fbJungian = await this.getFacetedFeedbackItems(
            'jungian',
            false,
          );
          jungianAnswers = prefData.jungianAnswers;
          jungianAnalysis = prefData.jungianAnalysis;
          mergePsychometricFeedback(jungianAnalysis, fbJungian, 'jungian');
        }
        if (prefData.facetedAnswers.length > 0) {
          const fbFaceted = await this.getFacetedFeedbackItems(
            'faceted',
            false,
          );
          facetedAnswers = prefData.facetedAnswers;
          facetedAnalysis = prefData.facetedAnalysis;
          mergePsychometricFeedback(facetedAnalysis, fbFaceted, 'faceted');
        }
      }
    }
    const result = showPsych
      ? {
          valid,
          ...userObj,
          facetedAnswers,
          facetedAnalysis,
          jungianAnswers,
          jungianAnalysis,
        }
      : {
          valid,
          ...userObj,
        };
    return res.send(result);
  }

  /*
   * Aux. method used with public user objects
   */
  mapPublicUser(
    user: User,
    facetedQuestions: any[] = [],
    jungianQuestions: any[] = [],
  ) {
    const {
      _id,
      nickName,
      identifier,
      active,
      geo,
      gender,
      preferences,
      dob,
      createdAt,
      modifiedAt,
    } = user;
    const facetedAnswers = filterMapSurveyByType(
      preferences,
      'faceted',
      facetedQuestions,
    );
    const facetedAnalysis = analyseAnswers('faceted', facetedAnswers);

    const jungianAnswers = filterMapSurveyByType(
      preferences,
      'jungian',
      jungianQuestions,
    );
    const jungianCompleted = jungianAnswers.length >= jungianQuestions.length;
    const jungianAnalysis = jungianCompleted
      ? analyseAnswers('jungian', jungianAnswers)
      : {};
    const miniCharts = preferences
      .filter(pr => pr.type === 'simple_astro_pair')
      .map(row => {
        const { key, value } = row;
        return { key, ...value };
      });
    return {
      _id,
      nickName,
      identifier,
      active,
      geo,
      gender,
      dob,
      createdAt,
      modifiedAt,
      facetedAnswers,
      facetedAnalysis,
      jungianAnswers,
      jungianAnalysis,
      miniCharts,
    };
  }

  @Delete('delete/:userID/:adminUserID')
  async deleteUser(
    @Res() res,
    @Param('userID') userID,
    @Param('adminUserID') adminUserID,
  ) {
    let status = HttpStatus.NOT_ACCEPTABLE;
    let authorised = false;
    const result = { valid: false, authorised: false, user: null };
    if (isValidObjectId(adminUserID)) {
      authorised = await this.userService.isAdminUser(adminUserID);
    } else {
      authorised = await this.userService.matchesToken(userID, adminUserID);
    }
    if (authorised) {
      result.authorised = true;
      if (isValidObjectId(userID)) {
        const user = await this.userService.deleteUser(userID);
        if (user instanceof Model) {
          result.user = extractSimplified(user, ['password']);
          result.valid = true;
          status = HttpStatus.OK;
          await this.userService.deleteAnswersByUserAndType(userID, 'jungian');
          await this.astrologicService.deleteChartByUser(userID);
          deleteUserFiles(userID, 'media');
        }
      }
    }
    return res.status(status).json(result);
  }

  /*
   * WebWidgets
   * Deletes a simple astro pair object within a public user record
   */
  @Delete('public-pair-delete/:uid/:key')
  async deletePublicPair(@Res() res, @Param('uid') uid, @Param('key') key) {
    const { exists, removed } = await this.userService.removePublicPreference(
      uid,
      key,
    );
    const status = exists
      ? removed
        ? HttpStatus.OK
        : HttpStatus.NOT_MODIFIED
      : HttpStatus.NOT_FOUND;
    return res.status(status).json({ valid: exists, removed });
  }

  /*
   * WebWidgets and Admin
   * Fetches public users for use with the widget admin area.
   */
  @Get('public-users/:start?/:limit?')
  async getPublicUsers(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const users = await this.userService.getPublicUsers(startInt, limitInt);
    const {
      facetedQuestions,
      jungianQuestions,
    } = await this.settingService.getPsychometricSurveys();
    const items = users.map(user =>
      this.mapPublicUser(user, facetedQuestions, jungianQuestions),
    );
    return res.json(items);
  }

  /*
   * WebWidgets
   * Fetches public user info identified by their email or ID for use with simple
   * widgets where no privacy is required.
   */
  @Get('public-user/:ref/:refMode?')
  async getPublicUser(
    @Res() res,
    @Param('ref') ref,
    @Param('refMode') refMode,
    @Query() query,
  ) {
    const refModeKey = notEmptyString(refMode) ? refMode : 'auto';
    let data: any = { valid: false };
    const params = objectToMap(query);
    const loadP2 = smartCastInt(params.get('p2'), 0) > 0;
    const loadKutas = smartCastInt(params.get('kutas'), 0) > 0;
    if (notEmptyString(ref, 6) && (isValidObjectId(ref) || validEmail(ref))) {
      const {
        facetedQuestions,
        jungianQuestions,
      } = await this.settingService.getPsychometricSurveys();
      const user = await this.userService.getPublicUser(ref, refModeKey);
      if (user instanceof Model) {
        data = this.mapPublicUser(
          user.toObject(),
          facetedQuestions,
          jungianQuestions,
        );
        if (data.facetedAnswers.length > 0) {
          const fbFaceted = await this.getFacetedFeedbackItems(
            'faceted',
            false,
          );
          mergePsychometricFeedback(data.facetedAnalysis, fbFaceted, 'faceted');
        }
        if (data.jungianAnswers.length > 0) {
          const fbJungian = await this.getFacetedFeedbackItems(
            'jungian',
            false,
          );
          mergePsychometricFeedback(data.jungianAnalysis, fbJungian, 'jungian');
        }
        const pkNumRef = params.has('pn') ? params.get('pn') : '1';
        const pkNum = isNumeric(pkNumRef) ? parseInt(pkNumRef) : 1;
        const cKey = ['astro_pair', pkNum].join('_');
        if (loadP2) {
          await mergeProgressSets(data, cKey);
        }
        if (loadKutas) {
          const pairData = data.miniCharts.find(mc => mc.key === cKey);
          if (pairData instanceof Object) {
            const c1 = basicSetToFullChart(pairData.p1);
            const c2 = basicSetToFullChart(pairData.p2);
            c1.setAyanamshaItemByKey('true_citra');
            c2.setAyanamshaItemByKey('true_citra');
            const kutaSet = await this.settingService.getKutaSettings();
            const kutaBuilder = new Kuta(c1, c2);
            kutaBuilder.loadCompatibility(kutaSet);
            const grahaKeys = ['su', 'mo', 've', 'as'];
            data.kutas = kutaBuilder.calcAllSingleKutas(
              true,
              grahaKeys,
              'dvadasha',
              false,
            );
            data.pcKey = cKey;
          }
        }
        data.valid = true;
      }
    }
    return res.json(data);
  }

  /*
    #development
  */
  @Get('fix-preferences/:start?/:limit?')
  async fixPreferences(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const preferences = await this.settingService.getPreferences();
    const data = await this.userService.fixPreferences(
      startInt,
      limitInt,
      preferences,
    );
    return res.json(data);
  }

  /*
    #mobile
  */
  @Post('profile-upload/:userID/:type/:mediaRef?/:title?')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Res() res,
    @Param('userID') userID,
    @Param('type') type,
    @Param('mediaRef') mediaRef = '',
    @Param('title') title = '',
    @UploadedFile() file,
  ) {
    let data: any = {
      valid: false,
      fileData: null,
      message: 'no file data',
      remaining: 0,
    };
    let status = HttpStatus.NOT_ACCEPTABLE;
    let remaining = 0;
    if (file instanceof Object) {
      const uploadAuth = await this.maxUploadByUser(userID);
      if (!uploadAuth.valid) {
        data.message = 'unmatched user';
        status = HttpStatus.NOT_FOUND;
      } else if (!uploadAuth.mayUploadMore) {
        data.message = `User has reached maximum upload limit of ${uploadAuth.limit}`;
      } else {
        remaining = uploadAuth.limit - uploadAuth.numUploaded;
        data.remaining = remaining;
      }
      if (uploadAuth.mayUploadMore) {
        const { originalname, mimetype, size, buffer } = file;
        const fn = generateFileName(userID, originalname);
        const { fileType, mime } = matchFileTypeAndMime(originalname, mimetype);
        const fileData = {
          filename: fn,
          mime,
          type: fileType,
          source: 'local',
          size,
          title,
          attributes: {},
          variants: [],
        };
        data = { valid: false, fileData };
        const intSize = parseInt(size, 10);
        const { filename, attributes, variants } = uploadMediaFile(
          userID,
          originalname,
          buffer,
          'image',
        );
        if (filename.length > 5) {
          fileData.filename = filename;
          fileData.mime = mimetype;
          fileData.size = intSize;
          fileData.attributes = attributes;
          fileData.variants = variants;
          const savedSub = await this.userService.saveProfileImage(
            userID,
            type,
            fileData,
            mediaRef,
          );
          if (savedSub.valid) {
            data.user = savedSub.user;
            status = HttpStatus.OK;
            data.message = 'success';
            data.remaining = remaining - 1;
          }
          data.valid = true;
        } else {
          data.message = 'File upload failed';
        }
      }
    }
    return res.status(status).json(data);
  }

  /*
    #mobile
  */
  @Delete('media-item/delete/:userID/:mediaRef')
  async deleteMediaItem(
    @Res() res,
    @Param('userID') userID,
    @Param('mediaRef') mediaRef,
  ) {
    const data: any = {
      valid: false,
      item: null,
      user: null,
      fileDeleted: false,
    };

    let status = HttpStatus.NOT_FOUND;
    const result = await this.userService.deleteMediaItemByRef(
      userID,
      mediaRef,
    );
    if (result.user instanceof Object) {
      data.user = result.user;
      status = HttpStatus.NOT_ACCEPTABLE;
    }
    if (result.deleted) {
      if (result.item instanceof Object) {
        data.item = result.item;
        data.valid = true;
        status = HttpStatus.OK;
        if (data.item.source === 'local') {
          data.fileDeleted = deleteFile(data.item.filename, 'media');
          if (data.item.variants.length > 0) {
            data.item.variants.forEach(suffix => {
              const parts = data.item.filename.split('.');
              const extension = parts.pop();
              const variantFn = [
                [parts.join('.'), suffix].join('-'),
                extension,
              ].join('.');
              deleteFile(variantFn, 'media');
            });
          }
        }
      }
    }
    return res.status(status).json(data);
  }

  /*
    #admin
  */
  @Get('media-path/:type')
  async mediaPathInfo(@Res() res, @Param('type') type) {
    const path = mediaPath(type);
    return res.json({ path });
  }

  /*
    #mobile
  */
  @Put('media-item/edit/:userID/:mediaRef?/:type?')
  async editMediaItem(
    @Res() res,
    @Param('userID') userID,
    @Param('mediaRef') mediaRef,
    @Param('type') type,
    @Body() mediaItem: MediaItemDTO,
  ) {
    const profileType = notEmptyString(type, 2) ? type : 'public';
    const mediaRefName = notEmptyString(mediaRef, 5) ? mediaRef : '';
    const result = await this.userService.editMediaItemByRef(
      userID,
      mediaRefName,
      mediaItem,
      profileType,
    );
    return res.json(result);
  }

  @Post('test-mail')
  async testMail(@Res() res, @Body() inData: EmailParamsDTO) {
    const result = await this.sendMail(inData);
    return res.json(result);
  }

  // Rate another user (like = 1, superlike = 2, pass = -1, -2, -3)
  @Post('feedback/:key')
  async send(
    @Res() res,
    @Param('key') key: string,
    @Body() payload: CreateFeedbackDTO,
  ) {
    const result = await this.sendFeedback(payload, key);
    return res.json(result);
  }

  async sendFeedback(
    payload: CreateFeedbackDTO,
    key = 'message',
    targetUser = '',
  ) {
    const user = await this.userService.getBasicById(payload.user, [
      'identifier',
      'fullName',
    ]);
    const keyStr = notEmptyString(key)
      ? key.replace(/-/g, '_').toLowerCase()
      : 'message';

    const result: any = {
      valid: false,
      msgId: '',
      identifier: '',
      fullName: '',
      mail: 'not_sent',
    };
    let isToAdmin = true;
    let toUserEmail = '';
    let toName = 'Support';
    if (notEmptyString(targetUser, 12) && isValidObjectId(targetUser)) {
      const toUser = await this.userService.getBasicById(payload.user, [
        'identifier',
        'fullName',
      ]);
      if (toUser instanceof Object) {
        toName = toUser.fullName;
        toUserEmail = toUser.identifier;
      }
      isToAdmin = false;
    }
    if (user instanceof Object && notEmptyString(user.identifier, 5)) {
      const id = await this.feedbackService.saveFeedback({
        ...payload,
        key: keyStr,
      });
      result.text = payload.text;
      if (payload.deviceDetails) {
        result.deviceDetails = payload.deviceDetails;
      }
      if (
        payload.mediaItems instanceof Array &&
        payload.mediaItems.length > 0
      ) {
        result.mediaItems = payload.mediaItems;
      }
      if (notEmptyString(id, 12)) {
        const fbType = keyStr.replace(/_/g, ' ');
        const subject = `${fbType}: ${user.fullName}`;
        result.valid = true;
        result.msgId = id;
        result.identifier = user.identifier;
        result.fullName = user.fullName;
        let bodyText = '';
        if (isToAdmin) {
          const path = webBaseUrl + '/manage/users/edit/' + payload.user;
          bodyText = `<p>User id: <a href="${path}" target="_blank">${payload.user}</a></p>`;
        }

        if (payload.deviceDetails) {
          bodyText += '<p>' + `Device: ${payload.deviceDetails}` + '</p>';
        }

        bodyText += `<br /><hr /><br /><article>` + payload.text + '</article>';

        const mailPayload = {
          to: toUserEmail, // list of receivers
          toName,
          from: user.identifier, // sender address
          fromName: user.fullName, //
          subject, //
          body: bodyText,
        };
        const md = await this.messageService.sendMail(mailPayload);
        if (md instanceof Object && md.result instanceof Object) {
          const mrKeys = Object.keys(md.result);
          if (mrKeys.includes('stack')) {
            result.mail = 'error';
          } else {
            result.mail = 'sent';
          }
        }
      }
    }
    return result;
  }

  @Post('post-feedback/:key')
  @UseInterceptors(FileInterceptor('file'))
  async postFeedback(
    @Res() res,
    @Body() payload,
    @Param('key') key,
    @UploadedFile('file') file,
  ) {
    let result: any = { valid: false };
    const payloadKeys =
      typeof payload === 'object' && payload !== null
        ? Object.keys({ ...payload })
        : [];
    if (
      file instanceof Object &&
      notEmptyString(key) &&
      payloadKeys.includes('text') &&
      payloadKeys.includes('user') &&
      notEmptyString(payload.text) &&
      notEmptyString(payload.user) &&
      notEmptyString(key)
    ) {
      const { originalname, mimetype, size, buffer } = file;
      const userID = payload.user;
      const fn = generateFileName(['feedback', userID].join('_'), originalname);
      const { fileType, mime } = matchFileTypeAndMime(originalname, mimetype);
      const title = key.replace(/[_-]/g, ' ');
      const fileData = {
        filename: fn,
        mime,
        type: fileType,
        source: 'local',
        size,
        title,
        attributes: {},
        variants: [],
      };
      const { attributes } = uploadMediaFile(
        userID,
        originalname,
        buffer,
        'files',
        'feedback',
      );
      if (attributes) {
        fileData.attributes = attributes;
      }
      const saveData: any = {
        user: payload.user,
        key,
        text: payload.text,
      };
      if (
        payloadKeys.includes('deviceDetails') &&
        notEmptyString(payload.deviceDetails)
      ) {
        saveData.deviceDetails = payload.deviceDetails;
      }
      saveData.mediaItems = [fileData];

      result = await this.sendFeedback(saveData as CreateFeedbackDTO, key);
      result.valid = true;
    }
    res.json(result);
  }

  async sendMail(emailParams: EmailParamsDTO) {
    const { to, toName, subject, html, from, fromName } = emailParams;
    const result = { valid: false, sent: false, error: null, response: null };
    const fromAddress = notEmptyString(from) ? from : mailDetails.fromAddress;
    const senderName = notEmptyString(fromName)
      ? fromName
      : mailDetails.fromName;
    const payload = {
      to, // list of receivers
      toName,
      from: fromAddress, // sender address
      fromName: senderName,
      subject,
      body: html,
    };
    await this.messageService
      .sendMail(payload)
      .then(data => {
        const keys = data instanceof Object ? Object.keys(data) : [];
        const hasResult =
          keys.length > 0 &&
          keys.includes('result') &&
          data.result instanceof Object;
        const validResponse = hasResult
          ? Object.keys(data.result).includes('stack') === false
          : false;
        result.sent = validResponse && data.result.sent === true;
        result.valid = validResponse;
        result.response = data;
      })
      .catch(e => {
        result.sent = false;
        result.error = e;
      });
    return { ...result, payload };
  }

  @Delete('file/:userID')
  async deleteFiles(@Res() res, @Param('userID') userID) {
    const result = await deleteUserFiles(userID, 'media');
    return res.json(result);
  }
}
