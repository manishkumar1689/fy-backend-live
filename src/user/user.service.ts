import { HttpStatus, Injectable } from '@nestjs/common';
import { isValidObjectId, Model } from 'mongoose';
import { ObjectId } from 'mongoose/lib/types';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService } from '@nest-modules/mailer';
import { User } from './interfaces/user.interface';
import { CreateUserDTO } from './dto/create-user.dto';
import {
  hashMapToObject,
  extractObject,
  extractSimplified,
  extractDocId,
} from '../lib/entities';
import * as bcrypt from 'bcrypt';
import { generateHash } from '../lib/hash';
import * as moment from 'moment-timezone';
import {
  inRange,
  isNumeric,
  isNumericType,
  isSystemFileName,
  notEmptyString,
  validEmail,
  validISODateString,
  validUri,
} from '../lib/validators';
import { Role } from './interfaces/role.interface';
import { Payment } from './interfaces/payment.interface';
import { PaymentOption } from './interfaces/payment-option.interface';
import { PaymentDTO } from './dto/payment.dto';
import { ProfileDTO } from './dto/profile.dto';
import { MatchedOption, PrefKeyValue } from './settings/preference-options';
import {
  extractArrayFromKeyedItems,
  extractBooleanFromKeyedItems,
  extractFloatFromKeyedItems,
  extractKeyedItemValue,
  extractProfileImage,
  extractStringFromKeyedItems,
  smartCastBool,
  smartCastFloat,
  smartCastInt,
  smartCastString,
} from '../lib/converters';
import { MediaItemDTO } from './dto/media-item.dto';
import { PreferenceDTO } from './dto/preference.dto';
import { matchFileTypeAndMime } from '../lib/files';
import { PublicUser } from './interfaces/public-user.interface';
import {
  assignJungianDomainValues,
  extractDefaultJungianPersonalityTypeLetters,
  extractFromBasicJungianSummary,
  jungianAnswersToResults,
  normalizedToPreference,
  summariseJungianAnswers,
} from '../setting/lib/mappers';
import { defaultPushNotifications } from '../lib/notifications';
import { AnswerDTO } from './dto/answer.dto';
import { AnswerSet } from './interfaces/answer-set.interface';
import { KeyNumValue } from '../lib/interfaces';
import {
  assignGenderOpt,
  extractSnippet,
  matchLangFromPreferences,
  removeIds,
} from '../lib/mappers';
import { SurveyResults } from './interfaces/survey-results.interface';

const userEditPaths = [
  'fullName',
  'nickName',
  'identifier',
  'roles',
  'mode',
  'gender',
  'active',
  'dob',
  'pob',
  'test',
  'geo',
  'placenames',
  'preview',
  'login',
  'preview',
];

const userSelectPaths = [
  '_id',
  ...userEditPaths,
  'status',
  'profiles',
  'preferences',
  'createdAt',
  'modifiedAt',
];

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('PublicUser')
    private readonly publicUserModel: Model<PublicUser>,
    @InjectModel('AnswerSet')
    private readonly answerSetModel: Model<AnswerSet>,
    private readonly mailerService: MailerService,
  ) {}
  // fetch all Users
  async list(
    start: number,
    limit: number,
    criteria: any = null,
    activeOnly = true,
  ): Promise<User[]> {
    const filterCriteria = this.buildCriteria(criteria, activeOnly);
    return await this.userModel
      .find(filterCriteria)
      .select(userSelectPaths.join(' '))
      .skip(start)
      .limit(limit)
      .sort({ createdAt: -1 });
  }
  // count users by criteria

  mapBasicUser(item: any = null) {
    const obj =
      item instanceof Object
        ? item
        : {
            _id: '',
            nickName: '',
            geo: { lat: 0, lng: 0 },
            roles: [],
            profiles: [],
            dob: null,
          };
    const {
      _id,
      nickName,
      dob,
      gender,
      geo,
      roles,
      profiles,
      preferences,
      surveys,
    } = obj;
    const profileImg = extractProfileImage(profiles);
    const showOnlineStatus = extractBooleanFromKeyedItems(
      preferences,
      'show_online_status',
      false,
    );
    const hideFromExplore = extractBooleanFromKeyedItems(
      preferences,
      'hide_from_explore',
      false,
    );

    const maxDistance = extractFloatFromKeyedItems(
      preferences,
      'max_distance',
      100,
    );

    const ageRange = extractArrayFromKeyedItems(
      preferences,
      'age_range',
      [0, 0],
      2,
    );
    const otherGender = gender === 'm' ? 'f' : 'm';
    const genders = extractArrayFromKeyedItems(
      preferences,
      'genders',
      [otherGender],
      1,
    );

    const hasAgeRange = ageRange.length > 0 && ageRange[0] > 0;

    const lang = extractStringFromKeyedItems(preferences, 'language', 'en');

    const pnData = extractKeyedItemValue(
      preferences,
      'push_notifications',
      'array',
    );

    const pushNotifications = pnData.matched
      ? pnData.item
      : defaultPushNotifications;

    let isPaidMember = false;
    if (roles instanceof Array && roles.length > 0) {
      isPaidMember = roles.some(rk => rk.includes('member'));
    }
    let age = -1;
    if (dob instanceof Date) {
      const currTs = new Date().getTime();
      const dobTs = dob.getTime();
      const ageTs = currTs - dobTs;
      age = ageTs / (365.25 * 24 * 60 * 60 * 1000);
    }
    const geoObj =
      geo instanceof Object
        ? { lat: geo.lat, lng: geo.lng }
        : { lat: 0, lng: 0 };
    const surveyItems =
      surveys instanceof Array && surveys.length > 0
        ? surveys.map(removeIds)
        : [];
    return {
      _id,
      nickName,
      roles,
      geo: geoObj,
      gender,
      age,
      ageRange,
      pushNotifications,
      hasAgeRange,
      profileImg,
      showOnlineStatus,
      hideFromExplore,
      maxDistance,
      lang,
      genders,
      isPaidMember,
      surveys: surveyItems,
    };
  }

  async getBasicByIds(ids: string[], uid: string) {
    const isActive = await this.isActive(uid);
    let users = [];
    if (isActive) {
      const items = await this.userModel
        .find({
          _id: {
            $in: ids,
          },
          active: true,
        })
        .select('_id nickName roles profiles');
      if (items.length > 0) {
        users = items.map(this.mapBasicUser);
      }
    }
    return users;
  }

  async getBasicById(uid: string, fields = []) {
    const fieldList =
      fields.length > 0
        ? fields.join(' ')
        : '_id active nickName dob geo gender roles profiles preferences surveys deviceTokens';
    const items = await this.userModel
      .find({
        _id: uid,
        active: true,
      })
      .select(fieldList);
    let user = null;
    if (items.length > 0) {
      const users = fields.length > 0 ? items : items.map(this.mapBasicUser);
      user = users[0];
    }
    return user;
  }

  async getNickName(uid: string): Promise<string> {
    const userRec = await this.getBasicById(uid, ['nickName']);
    return userRec instanceof Object ? userRec.nickName : '';
  }

  async getNickNameAndPic(
    uid: string,
  ): Promise<{ nickName: string; profileImg: string }> {
    const userRec = await this.getBasicById(uid, ['nickName', 'profiles']);
    const mapNameAndPic = (obj: any = null) => {
      const { nickName, profiles } = obj;
      return { nickName, profileImg: extractProfileImage(profiles) };
    };
    return userRec instanceof Object
      ? mapNameAndPic(userRec)
      : { nickName: '', profileImg: '' };
  }

  /* async updatePrefValue(userID = '', key = '', value = null, type = 'string') {
    const rec = await this.userModel.findById(userID).select('preferences');
    if (type === 'integer') {
      value = parseInt(value, 10);
    }
    let result = {};
    if (rec instanceof Model) {
      const hasPref =
        rec.preferences instanceof Array
          ? rec.preferences.some(pr => pr.key === key)
          : false;
      const edited = hasPref
        ? {
            $set: { 'preferences.$[outer].value': value },
          }
        : {
            $push: {
              preferences: {
                type,
                key,
                value,
              },
            },
          };
      const options = hasPref
        ? {
            arrayFilters: [
              {
                'outer.key': key,
              },
            ],
          }
        : {};
      result = await rec.update(edited, options);
      return { result, edited, options };
    }
    return { result };
  } */

  async getPreferredLangAndPnOptions(
    uid: string,
    withPn = true,
  ): Promise<{ lang: string; pushNotifications: string[] }> {
    const userRec = await this.getBasicById(uid, ['preferences']);
    const prefs =
      userRec instanceof Object && userRec.preferences instanceof Array
        ? userRec.preferences
        : [];
    const lang = extractStringFromKeyedItems(prefs, 'language', 'en');
    let pushNotifications = [];
    if (withPn) {
      const pnData = extractKeyedItemValue(
        prefs,
        'push_notifications',
        'array',
      );
      pushNotifications = pnData.matched
        ? pnData.item.filter(notEmptyString)
        : defaultPushNotifications;
    }
    return { lang, pushNotifications };
  }

  async getPreferredLang(uid: string): Promise<string> {
    const { lang } = await this.getPreferredLangAndPnOptions(uid, false);
    return lang;
  }

  async count(criteria: any = null, activeOnly = true): Promise<number> {
    const filterCriteria = this.buildCriteria(criteria, activeOnly);
    return await this.userModel.count(filterCriteria).exec();
  }

  buildCriteria = (criteria: object, activeOnly: boolean): object => {
    const filter = new Map<string, any>();
    if (criteria instanceof Object) {
      const keys = Object.keys(criteria);
      for (const key of keys) {
        const val = criteria[key];
        switch (key) {
          case 'roles':
            const roles = val instanceof Array ? val : val.split(',');
            if (roles instanceof Array) {
              filter.set(key, val);
            }
            break;
          case 'type':
            switch (val) {
              case 'admin':
              case 'admins':
                filter.set('$or', [
                  { roles: 'superadmin' },
                  { roles: 'admin' },
                  { roles: 'editor' },
                ]);
                break;
              case 'members':
              case 'member':
                filter.set('roles', 'active');
                break;
            }
            break;
          case 'active':
            filter.set(key, smartCastInt(val, 0) > 0 ? true : false);
            break;
          case 'fullName':
          case 'nickName':
            filter.set(key, new RegExp(val, 'i'));
            break;
          case 'email':
          case 'identifier':
            filter.set('identifier', new RegExp(val, 'i'));
            break;
          case 'usearch':
            const rgx = new RegExp('\\b' + val, 'i');
            const rgxEm = new RegExp(
              '\\b' + val.replace('.', '\\.') + '.?@',
              'i',
            );
            filter.set('$or', [
              { identifier: rgxEm },
              { nickName: rgx },
              { fullName: rgx },
            ]);
            break;
          case 'near':
            filter.set('coords', this.buildNearQuery(val));
            break;
          case 'test':
            const boolVal = smartCastBool(val);
            filter.set('test', boolVal);
            if (boolVal) {
              filter.set('test', boolVal);
              filter.set('dob', { $exists: true });
            }
            break;
          case 'createdAt':
            filter.set('createdAt', val);
            break;
        }
      }
      if (activeOnly) {
        filter.set('active', true);
      }
    }
    return hashMapToObject(filter);
  };

  buildMemberCriteria = (
    criteria: object,
    excludedIds: string[] = [],
    filteredForUser = false,
  ): object => {
    const filter = new Map<string, any>();
    const prefAndConditions: any[] = [];
    let notSkipHideFromExplore = true;
    if (criteria instanceof Object) {
      const keys = Object.keys(criteria);
      for (const key of keys) {
        const val = criteria[key];
        switch (key) {
          case 'roles':
            if (val instanceof Array) {
              filter.set(key, val);
            }
            break;
          case 'fullName':
          case 'nickName':
            filter.set(key, new RegExp(val, 'i'));
            break;
          case 'usearch':
            const rgx = new RegExp('\\b' + val, 'i');
            filter.set('$or', [{ nickName: rgx }, { fullName: rgx }]);
            break;
          case 'gender':
            const genderOpts =
              val instanceof Array
                ? val
                : typeof val === 'string'
                ? [
                    val
                      .trim()
                      .toLowerCase()
                      .substring(0, 1),
                  ]
                : [];
            if (genderOpts.length > 0) {
              filter.set('gender', { $in: genderOpts });
            }
            break;
          case 'age':
            filter.set('dob', this.translateAgeRange(val));
            break;
          case 'genders':
            prefAndConditions.push(this.translateTargetGenders(val));
            break;
          case 'age_range':
          case 'ageRange':
          case 'agerange':
            prefAndConditions.push(this.translateAgeRangeWithin(val));
            break;
          case 'profile':
            if (smartCastInt(val, 0) > 0) {
              filter.set('profiles.mediaItems.type', 'image');
            }
            break;
          case 'ids':
            if (val instanceof Array) {
              filter.set('_id', {
                $in: val.filter(
                  id => excludedIds.some(exId => exId === id) === false,
                ),
              });
            }
            break;
          case 'hidden':
            notSkipHideFromExplore = smartCastInt(val, 0) < 1;
            break;
        }
      }
    }
    if (notSkipHideFromExplore) {
      prefAndConditions.push({
        $elemMatch: { key: 'hide_from_explore', value: false },
      });
    }
    if (prefAndConditions.length > 0 && filteredForUser) {
      filter.set(
        '$and',
        prefAndConditions.map(cond => {
          return {
            preferences: cond,
          };
        }),
      );
    }
    filter.set('active', true);
    filter.set('roles', { $nin: ['superadmin', 'admin', 'blocked', 'editor'] });
    if (excludedIds.length > 0) {
      if (!filter.has('_id')) {
        filter.set('_id', { $nin: excludedIds.map(_id => new ObjectId(_id)) });
      }
    }
    return hashMapToObject(filter);
  };

  // Get a single User
  async getUser(userID: string, overrideSelectPaths = []): Promise<User> {
    const fields =
      overrideSelectPaths instanceof Array && overrideSelectPaths.length > 0
        ? overrideSelectPaths
        : userSelectPaths;
    const user = await this.userModel
      .findById(userID)
      .select(fields.join(' '))
      .exec();
    return user;
  }

  async getUserFields(userID = '', fields = []) {
    return await this.userModel
      .findById(userID)
      .select(fields.join(' '))
      .exec();
  }

  // Get a single User
  async memberRoles(userID: string): Promise<string[]> {
    const user = await this.getUserFields(userID, ['roles']);
    const roles = user instanceof Object ? user.roles : [];
    return roles;
  }

  // Get a single User
  async memberRolesAndLikeStart(
    userID: string,
  ): Promise<{
    roles: string[];
    likeStartTs: number;
    superlikeStartTs: number;
  }> {
    const user = await this.getUserFields(userID, [
      'roles',
      'likeStartTs',
      'superlikeStartTs',
    ]);
    const matched = user instanceof Object;
    const roles = matched ? user.roles : [];
    const likeStartTs = matched
      ? isNumericType(user.likeStartTs)
        ? user.likeStartTs
        : 0
      : 0;
    const superlikeStartTs = matched
      ? isNumericType(user.superlikeStartTs)
        ? user.superlikeStartTs
        : 0
      : 0;
    return { roles, likeStartTs, superlikeStartTs };
  }

  async getUserDeviceTokens(userID: string): Promise<string[]> {
    const tokenData = await this.getUser(userID, ['deviceTokens']);
    const tokenRefs = tokenData instanceof Object ? tokenData.deviceTokens : [];
    return tokenRefs instanceof Array ? tokenRefs : [];
  }

  async getUserStatus(userID: string): Promise<any> {
    const statusData = await this.getUser(userID, [
      'active',
      'roles',
      'status',
    ]);
    return statusData instanceof Model ? statusData.toObject() : {};
  }

  // Get a single User
  async findOneByToken(token): Promise<User> {
    return await this.userModel.findOne({ token }).exec();
  }

  // Get a single User
  async findOneByEmail(email: string, activeOnly = true): Promise<User> {
    const filter = new Map<string, any>();
    const rgx = new RegExp('^' + email.replace(/\./g, '.') + '$', 'i');
    filter.set('identifier', rgx);
    if (activeOnly) {
      filter.set('active', true);
    }
    const user = await this.userModel.findOne(hashMapToObject(filter)).exec();
    return user;
  }

  // Get a single User
  async findOneByEmailOrSocial(
    payload: CreateUserDTO,
    activeOnly = true,
  ): Promise<User> {
    const filter = new Map<string, any>();
    const conditions: any[] = [];
    const { identifier, socialId, mode } = payload;
    if (notEmptyString(identifier)) {
      const rgx = new RegExp('^' + identifier.replace(/\./g, '.') + '$', 'i');
      conditions.push({ identifier: rgx });
    }
    if (notEmptyString(socialId) && notEmptyString(mode) && mode !== 'local') {
      conditions.push({ socialId, mode });
    }
    if (conditions.length > 0) {
      filter.set('$or', conditions);
      if (activeOnly) {
        filter.set('active', true);
      }
      return await this.userModel.findOne(hashMapToObject(filter)).exec();
    }
  }

  async findByCriteria(criteria: any, activeOnly = true): Promise<string[]> {
    let users = [];
    if (criteria instanceof Object) {
      const filter = new Map<string, any>();
      const keys = Object.keys(criteria);

      for (const key of keys) {
        const val = criteria[key];
        const words = val.split(' ');
        let preLen = 0;
        if (val.length > 2) {
          preLen = val.length > 6 ? 4 : val.length - 2;
        }
        const rgx = new RegExp(
          '^.{0,' +
            preLen +
            '}' +
            val.toLowerCase().replace(/[^a-z0-9]/i, '.*?'),
          'i',
        );
        const fNameRgx = new RegExp('^\\s*' + words[0], 'i');
        const lNameRgx =
          words.length > 1
            ? new RegExp('^\\s*' + words.slice(1), 'i')
            : fNameRgx;

        switch (key) {
          case 'fullName':
          case 'nickName':
            filter.set(key, rgx);
            break;
          case 'email':
          case 'identifier':
            filter.set('identifier', rgx);
            break;
          case 'role':
            filter.set('roles', {
              $in: [val],
            });
            break;
          case 'roles':
            if (notEmptyString(val)) {
              const roles = val
                .split(',')
                .filter(notEmptyString)
                .map(r => r.trim());
              if (roles.length > 1) {
                filter.set('roles', {
                  $in: val,
                });
              }
            }
            break;
          case 'usearch':
            filter.set('$or', [
              { nickName: fNameRgx },
              { fullName: lNameRgx },
              { $and: [{ fullName: fNameRgx }, { nickName: lNameRgx }] },
              { identifier: rgx },
            ]);
            break;
        }
      }
      if (activeOnly) {
        filter.set('active', true);
      }
      users = await this.userModel
        .find(hashMapToObject(filter))
        .select('_id')
        .exec();
    }
    return users.map(u => u._id);
  }

  // create a single user with basic data
  async addUser(
    createUserDTO: CreateUserDTO,
    roles: Array<Role> = [],
  ): Promise<User> {
    const userObj = this.transformUserDTO(
      createUserDTO,
      true,
      roles,
      null,
      true,
    );
    const newUser = new this.userModel(userObj);
    return newUser.save();
  }

  // create a single user with basic data
  async create(inData = null): Promise<User> {
    const userObj = this.transformUserDTO(inData, true);

    const newUser = new this.userModel(userObj);
    return newUser.save();
  }

  transformUserDTO(
    inData = null,
    isNew = false,
    roles: Array<Role> = [],
    currentUser = null,
    mayEditPassword = false,
  ) {
    const hasCurrentUser = currentUser instanceof Object;
    const userObj = hasCurrentUser ? currentUser.toObject() : {};
    const userData = new Map<string, any>();
    const dt = new Date();
    if (isNew) {
      userData.set('roles', ['active']);
    } else if (hasCurrentUser) {
      userData.set('status', userObj.status);
    }
    Object.entries(inData).forEach(entry => {
      const [key, val] = entry;
      switch (key) {
        case 'password':
          if (mayEditPassword) {
            const tsSalt = dt.getTime() % 16;
            userData.set(key, bcrypt.hashSync(val, tsSalt));
            userData.set('mode', 'local');
          }
          break;
        case 'role':
          if (typeof val === 'string') {
            const roles = hasCurrentUser ? userObj.roles : [];
            if (roles.indexOf(val) < 0) {
              roles.push(val);
              userData.set('roles', roles);
            }
          }
          break;
        case 'roles':
          if (val instanceof Array) {
            userData.set('roles', val);
          }
          break;

        case 'deviceToken':
          if (typeof val === 'string') {
            userData.set('deviceTokens', [val]);
          }
          break;
        case 'deviceTokens':
          if (val instanceof Array) {
            userData.set('deviceTokens', val);
          }
          break;
        case 'nickName':
        case 'fullName':
        case 'imageUri':
        case 'mode':
        case 'socialId':
        case 'pob':
          userData.set(key, val);
          break;
        case 'identifier':
        case 'email':
          userData.set('identifier', val);
          break;
        case 'geo':
          if (val instanceof Object) {
            const map = new Map(Object.entries(val));
            const lng = map.get('lng');
            const lat = map.get('lat');
            if (isNumeric(lat) && isNumeric(lng)) {
              userData.set(key, val);
              userData.set('coords', [lng, lat]);
            }
          }
          break;
        default:
          if (userEditPaths.includes(key)) {
            userData.set(key, val);
          }
          break;
      }
    });

    const roleKeys = userData.get('roles');
    if (roleKeys instanceof Array) {
      const statusValues: Array<any> = [];
      roleKeys.forEach(role => {
        if (notEmptyString(role, 2) && roles.some(r => r.key === role)) {
          if (!userData.has('status') && typeof role === 'string') {
            const status = {
              role,
              current: true,
              createdAt: dt,
              modifiedAt: dt,
            };
            statusValues.push(status);
          }
        }
      });
      if (statusValues.length > 0) {
        userData.set('status', statusValues);
      }
    }
    if (isNew) {
      userData.set('active', true);
      userData.set('createdAt', dt);
    }
    const stVals = userData.has('status') ? userData.get('status') : [];
    if (stVals.length < 1) {
      userData.delete('status');
    }
    userData.set('modifiedAt', dt);
    return hashMapToObject(userData);
  }

  // Edit User details
  async updateUser(
    userID: string,
    createUserDTO: CreateUserDTO,
    roles: Role[] = [],
  ): Promise<{
    user: User;
    keys: string[];
    message: string;
    reasonKey: string;
  }> {
    const user =
      notEmptyString(userID) && isValidObjectId(userID)
        ? await this.userModel.findById(userID)
        : null;
    let updatedUser = {};
    let userObj: any = {};
    let message = 'User cannot be matched';
    let reasonKey = 'unmatched_user';
    let valid = false;
    if (user instanceof Model) {
      message = 'User has been updated successfully';
      const hasPassword = notEmptyString(createUserDTO.password);
      let hasOldPassword = false;
      const hasCurrentPassword = notEmptyString(user.password);
      let mayEditPassword = false;
      if (hasPassword && hasCurrentPassword) {
        hasOldPassword = notEmptyString(createUserDTO.oldPassword, 6);
        if (hasOldPassword) {
          mayEditPassword = bcrypt.compareSync(
            createUserDTO.oldPassword,
            user.password,
          );
          if (!mayEditPassword) {
            reasonKey = 'unmatched_old_password';
          }
        } else {
          const hasAdmin = notEmptyString(createUserDTO.admin, 12);
          mayEditPassword = hasAdmin
            ? await this.isAdminUser(createUserDTO.admin)
            : false;
          if (!mayEditPassword) {
            reasonKey = 'not_authorised';
          }
        }
      }
      if (hasPassword && !mayEditPassword) {
        if (user.mode !== 'local') {
          reasonKey = 'social_login';
          mayEditPassword = false;
          message =
            'May not edit password as user is authenticated via a third party service';
        } else {
          message = hasOldPassword
            ? `May not edit password as the old password could not be matched`
            : `Not authorised to edit the password`;
        }
        valid = false;
      }
      userObj = this.transformUserDTO(
        createUserDTO,
        false,
        roles,
        user,
        mayEditPassword,
      );
      const editKeys = Object.keys(userObj).filter(key => key !== 'modifiedAt');
      const hasProfileText =
        Object.keys(createUserDTO).includes('publicProfileText') &&
        notEmptyString(createUserDTO.publicProfileText, 2);
      if (hasProfileText) {
        const profile = {
          type: 'public',
          text: createUserDTO.publicProfileText,
        } as ProfileDTO;
        await this.saveProfile(userID, profile);
      }
      const hasPreferences =
        Object.keys(createUserDTO).includes('preferences') &&
        createUserDTO.preferences instanceof Array &&
        createUserDTO.preferences.length > 0;
      if (hasPreferences) {
        const user = await this.userModel.findById(userID);
        const prefs = this.mergePreferences(user, createUserDTO.preferences);
        userObj.preferences = prefs;
      }
      const mayNotEditPassword = hasPassword && !mayEditPassword;
      if (editKeys.length > 0 && !mayNotEditPassword) {
        updatedUser = await this.userModel.findByIdAndUpdate(userID, userObj, {
          new: true,
        });
        valid = true;
        if (updatedUser instanceof Model) {
          if (hasPassword && mayEditPassword) {
            reasonKey = 'password_edited';
          } else {
            reasonKey = 'user_edited';
          }
        }
      }
    }
    return {
      keys: Object.keys(userObj).filter(k => {
        return k === 'status' ? userObj[k].length > 0 : true;
      }),
      user: valid ? this.removeHiddenFields(updatedUser) : null,
      message,
      reasonKey,
    };
  }

  async registerLogout(
    userID = '',
    userRef = '',
    deviceTokenRef = '',
  ): Promise<{
    ts: number;
    matched: boolean;
    hasDeviceToken: boolean;
    deviceTokenMatched: boolean;
    login: any;
    loginTs: number;
  }> {
    const nowDt = new Date();
    const result = {
      ts: -1,
      matched: false,
      hasDeviceToken: false,
      deviceTokenMatched: false,
      login: null,
      loginTs: 0,
    };
    const user = await this.userModel
      .findById(userID)
      .select('identifier login deviceTokens');
    if (user instanceof Model) {
      const { identifier, deviceTokens, login } = user;
      const hasDeviceTokenRef = notEmptyString(deviceTokenRef, 6);
      const hasDeviceTokens =
        deviceTokens instanceof Array && deviceTokens.length > 0;
      const deviceTokenIndex =
        hasDeviceTokens && hasDeviceTokenRef
          ? deviceTokens.indexOf(deviceTokenRef)
          : -1;
      const deviceTokenMatched = deviceTokenIndex >= 0;
      const mayMatchIdentifier =
        notEmptyString(identifier, 4) && notEmptyString(userRef);
      const matched =
        deviceTokenMatched ||
        (mayMatchIdentifier &&
          identifier.toLowerCase() === userRef.toLowerCase());
      if (matched) {
        if (deviceTokenMatched) {
          deviceTokens.splice(deviceTokenIndex, 1);
        }
        const edited = deviceTokenMatched
          ? {
              deviceTokens,
              modifiedAt: nowDt,
            }
          : { modifiedAt: nowDt };
        const updated = await this.userModel.findByIdAndUpdate(userID, edited);
        result.ts = nowDt.getTime();
        result.deviceTokenMatched = deviceTokenMatched;
        result.hasDeviceToken = hasDeviceTokens;
        result.matched = updated instanceof Object;
        if (login instanceof Date) {
          result.login = login;
          result.loginTs = login.getTime();
        }
      }
    }
    return result;
  }

  /*
  @param string userID
  @param int intervalHrs
  @param int likeVal 
  @param int exactTs // -1 equals use current time + interval
  */
  async updateLikeStartTs(
    userID = '',
    intervalHrs = 12,
    likeVal = 1,
    exactTs = -1,
  ) {
    let startTs = -1;
    let matched = false;
    const nowDt = new Date();
    if (exactTs >= 0 && intervalHrs < 1) {
      startTs = exactTs;
    } else {
      const nowTs = nowDt.getTime();
      const likeStartIntervalMs = intervalHrs * 60 * 60 * 1000;
      startTs = nowTs + likeStartIntervalMs;
    }
    if (startTs >= 0) {
      const likeStartEdit =
        likeVal < 2 ? { likeStartTs: startTs } : { superlikeStartTs: startTs };
      const user = await this.userModel.findByIdAndUpdate(userID, {
        ...likeStartEdit,
        modifiedAt: nowDt,
      });
      matched = user instanceof Object;
    }
    return matched ? startTs : -1;
  }

  // Edit User password
  async updatePassword(userID, password: string): Promise<User> {
    const tsSalt = new Date().getTime() % 16;
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userID,
      {
        password: bcrypt.hashSync(password, tsSalt),
        token: '',
      },
      { new: true },
    );
    return updatedUser;
  }

  async updateStatus(
    userID,
    statusKey: string,
    roles: Array<Role> = [],
    paymentOption: PaymentOption = null,
    payData: PaymentDTO = null,
    expiryDt: Date = null,
    numBoosts = 0,
  ): Promise<User> {
    const user = await this.userModel.findById(userID);
    const validRole = roles.some(r => r.key === statusKey);
    if (user && validRole) {
      const userObj = extractObject(user);
      let payment = null;
      const { boosts } = userObj;
      if (payData instanceof Object) {
        const { service, ref, amount, curr, createdAt } = payData;
        payment = { service, ref, amount, curr, createdAt };
      }
      const currDt = new Date();
      let expiryDate = null;
      if (expiryDt instanceof Date) {
        expiryDate = expiryDt;
      } else if (paymentOption instanceof Object) {
        const { period, duration } = paymentOption;
        if (duration > 0 && notEmptyString(period)) {
          expiryDate = moment()
            .add(duration, period)
            .toDate();
        }
      }
      const { status } = userObj;
      let statuses = status instanceof Array ? status : [];
      const currIndex = statuses.findIndex(
        s => s.role === statusKey && s.current,
      );
      let newPayments: Array<Payment> = [];
      if (payment instanceof Object) {
        if (currIndex >= 0) {
          const prevPayments = statuses[currIndex].payments;
          if (prevPayments instanceof Array) {
            newPayments = [...prevPayments, payment];
          } else {
            newPayments = [payment];
          }
        } else {
          newPayments = [payment];
        }
      }

      if (currIndex < 0) {
        const newStatus = {
          role: statusKey,
          current: true,
          payments: newPayments,
          createdAt: currDt,
          expiresAt: expiryDate,
          modifiedAt: currDt,
        };
        statuses.push(newStatus);
      } else {
        const currStatus = statuses[currIndex];
        const editedStatus = {
          role: currStatus.role,
          current: true,
          payments: newPayments,
          createdAt: currStatus.createdAt,
          expiresAt: expiryDate,
          modifiedAt: currDt,
        };
        statuses[currIndex] = editedStatus;
      }
      statuses = statuses.map(st => {
        if (st.expiresAt) {
          switch (st.role) {
            case 'active':
              break;
            default:
              st.current = moment(currDt) <= moment(st.expiresAt);
              break;
          }
        }
        return st;
      });
      const newRoles = statuses.filter(st => st.current).map(st => st.role);
      const active =
        newRoles.length > 0 && newRoles.includes('blocked') === false;
      const edited: any = {
        active,
        roles: newRoles,
        status: statuses,
        modifiedAt: currDt,
      };
      if (numBoosts > 0) {
        const currBoosts = isNumeric(boosts) ? smartCastInt(boosts, 0) : 0;
        edited.boosts = currBoosts + numBoosts;
      }
      return await this.userModel.findByIdAndUpdate(userID, edited, {
        new: true,
      });
    }
  }

  async decrementBoost(userID = '') {
    const user = await this.userModel.findById(userID).select('boosts');
    const result = { valid: false, boosts: 0 };
    if (user instanceof Model) {
      const { boosts } = user;
      if (isNumeric(boosts)) {
        const currBoosts = smartCastInt(boosts);
        if (currBoosts > 0) {
          const edited = {
            boosts: currBoosts - 1,
          };
          const editedUser = await this.userModel.findByIdAndUpdate(
            userID,
            edited,
            { new: true },
          );
          if (editedUser) {
            result.boosts = currBoosts - 1;
            result.valid = true;
          }
        }
      }
    }
    return result;
  }

  async updateActive(
    userID = '',
    active = false,
    reason = '',
    expiryDate = null,
    removeLastBlock = false,
  ) {
    const user = await this.userModel.findById(userID);
    if (user instanceof Model) {
      const userObj = user.toObject();
      const { status } = userObj;
      const statusItems = status instanceof Array ? status : [];
      const numItems = statusItems.length;
      const reverseBlockIndex = statusItems
        .map(st => st)
        .reverse()
        .findIndex(st => st.role === 'block');
      const lastBlockIndex =
        reverseBlockIndex >= 0 ? numItems - 1 - reverseBlockIndex : -1;
      const dt = new Date();
      const expiresAt =
        expiryDate instanceof Date
          ? expiryDate
          : validISODateString(expiryDate)
          ? new Date(expiryDate)
          : new Date(dt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const block =
        lastBlockIndex >= 0
          ? statusItems[lastBlockIndex]
          : {
              role: 'block',
              current: active,
              expiresAt,
              createdAt: dt,
              modifiedAt: dt,
            };
      if (notEmptyString(reason)) {
        block.reason = reason;
      }
      if (active) {
        if (lastBlockIndex >= 0) {
          if (removeLastBlock) {
            statusItems.splice(lastBlockIndex, 1);
          } else {
            block.current = false;
            block.expiresAt = new Date(dt.getTime() - 3600 * 1000);
            block.reason = 'unblocked';
          }
        }
      } else {
        if (lastBlockIndex >= 0) {
          if (!removeLastBlock) {
            block.expiresAt = expiresAt;
            block.modifiedAt = dt;
          }
        }
      }
      if (lastBlockIndex < 0 && !active) {
        statusItems.push(block);
      } else if (!removeLastBlock) {
        statusItems[lastBlockIndex] = block;
      }
      await this.userModel.findByIdAndUpdate(userID, {
        active,
        roles: statusItems.filter(st => st.current).map(st => st.role),
        status: statusItems,
        modifiedAt: dt,
      });
      return { ...userObj, active, status: statusItems, modifiedAt: dt };
    }
    return {};
  }

  async removeStatus(userID, statusKey: string): Promise<User> {
    const user = await this.userModel.findById(userID);
    if (user) {
      const userObj = extractObject(user);
      const currDt = new Date();
      const { status } = userObj;
      let statuses = status instanceof Array ? status : [];
      statuses = statuses.filter(
        s => s.role !== statusKey && notEmptyString(s.role),
      );
      const newRoles = statuses.filter(st => st.current).map(st => st.role);
      const active =
        newRoles.length > 0 && newRoles.includes('blocked') === false;
      return await this.userModel.findByIdAndUpdate(
        userID,
        {
          active,
          roles: newRoles,
          status: statuses,
          modifiedAt: currDt,
        },
        { new: true },
      );
    }
  }

  async requestReset(userID: string, mode: string) {
    const user = await this.userModel.findById(userID);
    if (user) {
      if (user.active || mode === 'pending') {
        const modifiedAt = new Date().toISOString();
        const token = generateHash();
        return await this.userModel.findByIdAndUpdate(
          userID,
          {
            token,
            modifiedAt,
          },
          { new: true },
        );
      }
    }
  }

  async registerLogin(
    userID: string,
    deviceToken = '',
    geo = null,
  ): Promise<string> {
    const login = new Date().toISOString();
    const hasDeviceToken = notEmptyString(deviceToken, 5);
    const geoKeys = geo instanceof Object ? Object.keys(geo) : [];
    const hasGeo = geoKeys.includes('lat') && geoKeys.includes('lng');
    const edited: Map<string, any> = new Map();
    edited.set('login', login);
    if (hasDeviceToken) {
      const deviceTokens = await this.getUserDeviceTokens(userID);
      const tokenExists =
        deviceTokens.length > 0 ? deviceTokens.includes(deviceToken) : false;
      if (!tokenExists) {
        deviceTokens.push(deviceToken);
        edited.set('deviceTokens', deviceTokens);
      }
    }
    if (hasGeo) {
      const nullVal =
        (geo.lat === 0 && geo.lng === 0) ||
        !isNumeric(geo.lat) ||
        !isNumeric(geo.lng);
      if (!nullVal) {
        edited.set('geo', geo);
        edited.set('coords', [geo.lng, geo.lat]);
      }
    }
    const editedObj = Object.fromEntries(edited.entries());
    const user = await this.userModel.findByIdAndUpdate(userID, editedObj);
    if (user) {
      return login;
    } else {
      return '-';
    }
  }

  // Delete a User
  async deleteUser(UserID: string): Promise<any> {
    const deletedUser = await this.userModel.findByIdAndRemove(UserID);
    return deletedUser;
  }

  async isValidRoleUser(userID: string, role: string): Promise<boolean> {
    const user = await this.getUser(userID);
    if (user) {
      return this.hasRole(user, role);
    }
    return false;
  }

  async members(
    start = 0,
    limit = 100,
    criteria = null,
    excludedIds: string[] = [],
    filteredForUser = false,
  ) {
    //const userID = Object.keys(criteria).includes('user')? criteria.user : '';
    const matchCriteria = this.buildMemberCriteria(
      criteria,
      excludedIds,
      filteredForUser,
    );
    let nearStage = null;
    if (Object.keys(criteria).includes('near')) {
      const geoMatch = this.buildNearQuery(criteria.near);
      if (geoMatch instanceof Object) {
        const { $near } = geoMatch;
        if ($near instanceof Object) {
          const { $geometry, $minDistance, $maxDistance } = $near;
          nearStage = {
            $geoNear: {
              near: $geometry,
              minDistance: $minDistance,
              maxDistance: $maxDistance,
              spherical: true,
              distanceField: 'distance',
            },
          };
        }
      }
    }
    const steps = [
      { $match: matchCriteria },
      {
        $project: {
          roles: 1,
          preview: 1,
          fullName: 1,
          nickName: 1,
          active: 1,
          dob: 1,
          pob: 1,
          'placenames.fullname': 1,
          'placenames.type': 1,
          'placenames.name': 1,
          'geo.lat': 1,
          'geo.lng': 1,
          'geo.alt': 1,
          distance: 1,
          profiles: 1,
          'preferences.key': 1,
          'preferences.type': 1,
          'preferences.value': 1,
          'surveys.type': 1,
          'surveys.values.domain': 1,
          'surveys.values.subdomain': 1,
          'surveys.values.value': 1,
          gender: 1,
        },
      },
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
    ];
    if (nearStage instanceof Object) {
      steps.unshift(nearStage);
    }
    const users = await this.userModel.aggregate(steps);
    return users;
  }

  hasRole(user: User, role: string): boolean {
    if (user.roles.includes(role)) {
      return user.active;
    }
    return false;
  }

  async savePreference(
    userID: string,
    preference: PreferenceDTO,
    feedbackItems: any[] = [],
  ) {
    const data = {
      user: null,
      valid: false,
    };
    if (notEmptyString(userID, 16) && preference instanceof Object) {
      const sd = await this.savePreferences(userID, [preference]);
      if (sd.valid) {
        if (feedbackItems.length > 2) {
          const surveys = await this.matchSurveyData(
            userID,
            sd.user,
            feedbackItems,
          );
          data.user = { ...sd.user, surveys };
        } else {
          data.user = sd.user;
        }
        data.valid = true;
      }
    }
    return data;
  }

  async savePreferences(userID: string, prefItems: PreferenceDTO[] = []) {
    const user = await this.userModel.findById(userID);
    const profileTextTypes = [
      'profileText',
      'profile_text',
      'publicProfileText',
      'bio',
    ];
    const otherTypes = [...profileTextTypes, 'user'];
    const stringFields = ['fullName', 'nickName'];
    const dtFields = ['dob'];
    const data = {
      user: null,
      valid: false,
      active: false,
      exists: false,
    };
    if (user instanceof Object && prefItems instanceof Array) {
      const prefs = this.mergePreferences(
        user,
        prefItems.filter(
          pr => pr instanceof Object && otherTypes.includes(pr.type) === false,
        ),
      );
      data.exists = true;
      data.active = user.active;
      const dt = new Date();
      const editMap: Map<string, any> = new Map();
      editMap.set('preferences', prefs);
      editMap.set('modifiedAt', dt);
      const userOpts = prefItems.filter(
        pr => pr instanceof Object && pr.type === 'user',
      );
      if (userOpts.length > 0) {
        userOpts.forEach(row => {
          const { key, value } = row;
          const dataType = typeof value;
          if (key === 'gender' && dataType === 'string') {
            editMap.set('gender', value);
          } else if (key === 'geo' && dataType === 'object') {
            const { lat, lng, altVal } = value;
            if (
              isNumeric(lat) &&
              isNumeric(lng) &&
              inRange(lng, [-180, 180]) &&
              inRange(lat, [-90, 90])
            ) {
              const alt = smartCastFloat(altVal, 10);
              editMap.set('geo', { lat, lng, alt });
              editMap.set('coords', [lng, lat]);
            }
          } else if (stringFields.includes(key)) {
            editMap.set(key, value);
          } else if (dtFields.includes(key)) {
            if (validISODateString(value)) {
              editMap.set(key, value);
            }
          }
        });
      }
      const profileItem = prefItems.find(
        pr => pr instanceof Object && profileTextTypes.includes(pr.type),
      );
      if (profileItem instanceof Object) {
        const profileType = ['private', 'protected'].includes(profileItem.type)
          ? profileItem.type
          : 'public';
        const pubProfile = {
          type: profileType,
          text: profileItem.value,
        } as ProfileDTO;
        const userObj = user.toObject();
        const profiles =
          userObj.profiles instanceof Array ? userObj.profiles : [];
        const currProfileIndex = profiles.findIndex(
          pr => pr.type === profileType,
        );
        const currProfile =
          currProfileIndex < 0 ? null : profiles[currProfileIndex];
        const profile = this.updateProfile(pubProfile, currProfile, dt);
        if (currProfileIndex < 0) {
          profiles.unshift(profile);
        } else {
          profiles[currProfileIndex] = profile;
        }
        editMap.set('profiles', profiles);
      }
      const edited = Object.fromEntries(editMap.entries());
      if (prefItems.length === 1 && prefItems[0].key === 'jungian_type') {
        const surveyData = user.surveys instanceof Array ? user.surveys : [];
        const ci = surveyData.findIndex(s => s.type === 'jungian');
        const newItem = {
          type: 'jungian',
          values: assignJungianDomainValues(prefItems[0].value),
        } as SurveyResults;
        if (ci < 0) {
          surveyData.push(newItem);
        } else {
          surveyData[ci] = newItem;
        }
        edited.surveys = surveyData;
      }
      const savedUser = await this.userModel.findByIdAndUpdate(userID, edited, {
        new: true,
      });
      data.user = this.removeHiddenFields(savedUser);
      data.valid = data.user instanceof Object;
    }
    return data;
  }

  async memberActive(
    userID: string,
  ): Promise<{
    active: boolean;
    exists: boolean;
    validId: boolean;
    status: number;
  }> {
    let user = null;
    const validId = isValidObjectId(userID);
    if (validId) {
      user = await this.userModel
        .findOne({ _id: userID })
        .select({ active: 1 });
    }
    const exists = user instanceof Object;
    const active = exists && user.active;
    const status = active
      ? HttpStatus.OK
      : exists && validId
      ? HttpStatus.UNAUTHORIZED
      : !validId
      ? HttpStatus.NOT_ACCEPTABLE
      : HttpStatus.NOT_FOUND;
    return {
      exists,
      active,
      validId,
      status,
    };
  }

  removeHiddenFields(user = null) {
    const userObj =
      user instanceof Object
        ? user instanceof Model
          ? user.toObject()
          : user
        : {};
    const keys = Object.keys(userObj);
    const hiddenKeys = ['password', 'coords', '__v'];
    hiddenKeys.forEach(key => {
      if (keys.includes(key)) {
        delete userObj[key];
      }
    });
    return userObj;
  }

  async saveRecentChartOrder(userID: string, idRefs: string[] = []) {
    const data = {
      user: null,
      valid: false,
    };
    if (
      notEmptyString(userID, 16) &&
      idRefs instanceof Array &&
      idRefs.length > 0
    ) {
      const preference = {
        key: 'recent_chart_ids',
        type: 'array_string',
        value: idRefs,
      } as PreferenceDTO;
      const sd = await this.savePreferences(userID, [preference]);
      if (sd.valid) {
        data.user = sd.user;
        data.valid = true;
      }
    }
    return data;
  }

  async getRecentChartIds(userID: string) {
    const user = await this.userModel.findById(userID).select('preferences');
    let ids: string[] = [];
    if (user instanceof Model) {
      if (user.preferences instanceof Array) {
        const row = user.preferences.find(pr => pr.key === 'recent_chart_ids');
        if (row instanceof Object && row.value instanceof Array) {
          ids = row.value;
        }
      }
    }
    return ids;
  }

  mergePreferences(user: User, prefItems: PreferenceDTO[] = []) {
    const userData = user.toObject();
    const { preferences } = userData;
    const prefs = preferences instanceof Array ? preferences : [];
    const filteredPreferences = prefItems.filter(
      pr => pr instanceof Object && pr.type !== 'user',
    );

    const gendersOptIndex = filteredPreferences.findIndex(
      op => op.type !== 'user' && ['gender', 'genders'].includes(op.key),
    );
    let removeOldGenderOpt = false;
    if (gendersOptIndex >= 0) {
      const gOpt = prefItems[gendersOptIndex];

      const gendersVal =
        gOpt.value instanceof Array ? gOpt.value : assignGenderOpt(gOpt.value);
      filteredPreferences[gendersOptIndex] = {
        key: 'genders',
        value: gendersVal,
        type: 'array_string',
      };
      removeOldGenderOpt = preferences.some(op => op.key === 'gender');
    }
    for (const prefItem of filteredPreferences) {
      const pKeys = Object.keys(prefItem);
      if (
        pKeys.includes('key') &&
        pKeys.includes('value') &&
        pKeys.includes('type')
      ) {
        const key = prefItem.key.split('__').pop();
        const edited = { ...prefItem, key };
        const currPreferenceIndex = preferences.findIndex(pr => pr.key === key);
        if (currPreferenceIndex >= 0) {
          prefs[currPreferenceIndex].value = prefItem.value;
        } else {
          prefs.push(edited);
        }
      }
    }
    return prefs.filter(op => !removeOldGenderOpt || op.key !== 'gender');
  }

  async matchSurveyData(
    userID = '',
    userObj = null,
    feedbackItems: any[] = [],
  ) {
    const { answers } = await this.getSurveyDomainScoresAndAnswers(
      userID,
      'jungian',
      true,
    );
    const hasAnswers = answers instanceof Array && answers.length > 8;
    let defaultLetters = '';
    let hasJungianData = hasAnswers;
    if (!hasAnswers) {
      const strLetters = extractDefaultJungianPersonalityTypeLetters(userObj);
      if (strLetters.length === 4) {
        defaultLetters = strLetters;
        hasJungianData = true;
      }
    }
    if (hasJungianData) {
      const matchedLang = matchLangFromPreferences(userObj.preferences);
      const analysis = hasAnswers
        ? summariseJungianAnswers(answers)
        : extractFromBasicJungianSummary(userObj);
      let merged = { title: '', text: '', categories: [], letters: '' };
      if (feedbackItems.length > 2) {
        merged = this.mergeSurveyFeedback(analysis, matchedLang, feedbackItems);
      }
      const letters = hasAnswers ? merged.letters : defaultLetters;
      return {
        jungian: {
          title: merged.title,
          text: merged.text,
          letters,
          analysis,
          categories: merged.categories,
          answers,
        },
      };
    } else {
      return {};
    }
  }

  mergeSurveyFeedback(
    analysis: any = null,
    matchedLang = 'en',
    feedbackItems: any[] = [],
  ) {
    const ucLetters = Object.keys(analysis).map(lt => lt.toUpperCase());
    const spectra = ['IE', 'SN', 'FT', 'JP'];
    const letters = spectra
      .map(pair => {
        const letter = ucLetters.find(
          lt => lt === pair.substring(0, 1) || lt === pair.substring(1, 2),
        );
        return typeof letter === 'string' ? letter : '';
      })
      .join('')
      .toLowerCase();
    const snKeys = [
      ['_', 'name', letters].join('_'),
      ['_', 'type', letters].join('_'),
    ];
    let title = '';
    let text = '';
    snKeys.forEach(sk => {
      if (sk.includes('_name_')) {
        title = extractSnippet(feedbackItems, sk, matchedLang);
      } else {
        text = extractSnippet(feedbackItems, sk, matchedLang);
      }
    });
    const categoryEntries = Object.entries(analysis)
      .map(([key, value]) => {
        let polarity = spectra.find(pair => pair.includes(key.toUpperCase()));
        const segment = value <= 20 ? 'ave' : 'high';
        let text = '';
        if (notEmptyString(polarity)) {
          const snKey = ['_', 'sub', polarity, key, segment]
            .join('_')
            .toLowerCase();
          text = extractSnippet(feedbackItems, snKey, matchedLang);
        } else {
          polarity = '__';
        }
        return [polarity, text];
      })
      .filter(entry => entry[0] !== '__');
    return {
      title,
      text,
      letters,
      categories: Object.fromEntries(categoryEntries),
    };
  }

  async saveProfile(userID: string, profile: ProfileDTO) {
    const user = await this.userModel.findById(userID);
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object) {
      const userData = user.toObject();
      const dt = new Date();
      if (user.profiles instanceof Array) {
        const profileIndex = await user.profiles.findIndex(
          up => up.type === profile.type,
        );
        if (profileIndex >= 0) {
          //const { createdAt } = userData.profiles[profileIndex];
          const editedProfile = this.updateProfile(
            profile,
            userData.profiles[profileIndex],
            dt,
          );
          userData.profiles[profileIndex] = { ...editedProfile };
        } else {
          userData.profiles.push(profile);
        }
      } else {
        userData.profiles = [profile];
      }
      data.user = await this.userModel.findByIdAndUpdate(
        userID,
        { profiles: userData.profiles, modifiedAt: dt },
        {
          new: true,
        },
      );
      data.valid = true;
    }
    return data;
  }

  updateProfile(
    profile: ProfileDTO,
    currentProfile: any = null,
    modifiedAt = null,
  ) {
    const hasCurrent = currentProfile instanceof Object;
    if (hasCurrent) {
      const edited = Object.assign({}, currentProfile);
      Object.entries(profile).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'text':
            edited.text = value;
            break;
        }
      });
      if (modifiedAt) {
        edited.modifiedAt = modifiedAt;
      }
      return edited;
    } else {
      return profile;
    }
  }

  async saveProfileImage(
    userID: string,
    type: string,
    fileRef = null,
    mediaRef = '',
  ) {
    const user = await this.userModel.findById(userID);
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object) {
      const dt = new Date().toISOString();
      const userData = this.assignProfile(user, type, fileRef, mediaRef, dt);
      data.user = await this.userModel.findByIdAndUpdate(
        userID,
        { profiles: userData.profiles, modifiedAt: dt },
        {
          new: true,
        },
      );
      data.valid = userData instanceof Object;
      data.user = extractSimplified(userData, ['password', 'coords']);
    }
    return data;
  }

  /**
   * aux. method to assign extra profile data
   * @param user User,
   * profileRef Object | string either the profile type or profile object
   * mediaItemRef Object
   * mediaRef string name of file to be replaced
   */
  assignProfile(
    user: User,
    profileRef = null,
    mediaItemRef = null,
    mediaRef = '',
    dtRef = '',
  ) {
    const userData = user.toObject();
    let profile: any = {};
    let hasProfileData = false;
    if (profileRef instanceof Object) {
      profile = profileRef;
      hasProfileData = true;
    } else if (notEmptyString(profileRef)) {
      hasProfileData = true;
      profile = {
        type: profileRef,
        text: '',
      };
    }
    let mediaItem: any = null;
    let hasMediaItem = false;
    if (mediaItemRef instanceof Object) {
      const mediaKeys = Object.keys(mediaItemRef);
      if (mediaKeys.includes('filename')) {
        mediaItem = mediaItemRef;
        hasMediaItem = true;
      }
    }
    if (user.profiles instanceof Array) {
      const profileIndex = user.profiles.findIndex(
        up => up.type === profile.type,
      );
      if (profileIndex >= 0) {
        const currProfile = userData.profiles[profileIndex];
        const editedProfile: Map<string, any> = new Map(
          Object.entries(currProfile),
        );
        Object.entries(currProfile).forEach(entry => {
          const [k, v] = entry;
          switch (k) {
            case 'createdAt':
              break;
            case 'text':
              if (typeof v === 'string') {
                editedProfile.set(k, v);
              }
              break;
          }
        });
        if (hasMediaItem) {
          if (editedProfile.has('mediaItems')) {
            let items = editedProfile.get('mediaItems');
            let itemIndex = -1;
            if (items instanceof Array) {
              const fileName =
                isSystemFileName(mediaRef) || validUri(mediaRef)
                  ? mediaRef
                  : mediaItem.filename;
              itemIndex = items.findIndex(mi => mi.filename === fileName);
            } else {
              items = [];
            }
            if (itemIndex >= 0) {
              items[itemIndex] = mediaItem;
            } else {
              items.push(mediaItem);
            }
          }
        }
        editedProfile.set('createdAt', currProfile.createdAt);
        userData.profiles[profileIndex] = Object.fromEntries(
          editedProfile.entries(),
        );
      } else {
        if (hasMediaItem) {
          profile.mediaItems = [mediaItem];
        }
        if (validISODateString(dtRef)) {
          profile.modifiedAt = dtRef;
        }
        userData.profiles.push(profile);
      }
    } else if (hasProfileData) {
      if (hasMediaItem) {
        profile.mediaItems = [mediaItem];
      }
      userData.profiles = [profile];
    }
    return userData;
  }

  async deleteMediaItemByRef(userID: string, mediaRef = '') {
    const user = await this.getUser(userID);
    const data = {
      item: null,
      user: null,
      valid: user instanceof Object,
      deleted: false,
    };
    if (data.valid) {
      const userObj = user.toObject();
      const { profiles } = userObj;
      if (profiles instanceof Array) {
        profiles.forEach((profile, index) => {
          const { mediaItems } = profile;
          if (mediaItems instanceof Array && mediaItems.length > 0) {
            const mediaIndex = mediaItems.findIndex(
              mi => mi.filename === mediaRef,
            );
            if (mediaIndex >= 0) {
              data.item = Object.assign({}, mediaItems[mediaIndex]);
              userObj.profiles[index].mediaItems.splice(mediaIndex, 1);
              this.userModel
                .findByIdAndUpdate(userID, {
                  profiles: userObj.profiles,
                })
                .exec();
              data.deleted = true;
            }
          }
        });
        data.user = userObj;
      }
    }
    return data;
  }

  async editMediaItemByRef(
    userID: string,
    mediaRef = '',
    item: MediaItemDTO,
    profileType = '',
  ) {
    const user = await this.getUser(userID);
    const data = {
      item: null,
      user: null,
      valid: user instanceof Object,
      new: false,
      edited: false,
    };
    if (data.valid && item instanceof Object) {
      const userObj = user.toObject();
      const { profiles } = userObj;
      const hasProfile = notEmptyString(profileType, 2);
      let matched = false;
      if (profiles instanceof Array) {
        profiles.forEach((profile, index) => {
          const { mediaItems } = profile;
          if (mediaItems instanceof Array && mediaItems.length > 0) {
            const mediaIndex = mediaItems.findIndex(
              mi => mi.filename === mediaRef || mi._id.toString() === mediaRef,
            );
            if (mediaIndex >= 0) {
              matched = true;
              userObj.profiles[index].mediaItems[
                mediaIndex
              ] = this.assignMediaItem(item, mediaItems[mediaIndex]);
            }
          }
        });
        if (!matched && hasProfile) {
          const profileIndex = profiles.findIndex(
            pr => pr.type === profileType,
          );
          const newMediaItem = this.assignMediaItem(item);
          const itemKeys = Object.keys(newMediaItem);
          const valid =
            itemKeys.includes('filename') && itemKeys.includes('mime');
          if (valid) {
            if (profileIndex >= 0) {
              userObj.profiles[profileIndex].mediaItems.push(newMediaItem);
            } else {
              const newProfile = {
                type: profileType,
                text: '',
                mediaItems: [newMediaItem],
              };
              userObj.profiles.push(newProfile);
            }
            matched = true;
          }
        }
        if (matched) {
          this.userModel
            .findByIdAndUpdate(userID, {
              profiles: userObj.profiles,
            })
            .exec();
          data.edited = true;
        }
        data.new = !matched;
        data.user = userObj;
      }
    }
    return data;
  }

  assignMediaItem(item: MediaItemDTO, current: any = null) {
    const fields = [
      'filename',
      'mime',
      'source',
      'size',
      'attributes',
      'type',
      'title',
    ];
    const hasCurrent = current instanceof Object && current !== null;
    const currentKeys = hasCurrent ? Object.keys(current) : [];
    const newKeys = Object.keys(item);
    const mp: Map<string, any> = new Map();
    fields.forEach(key => {
      if (newKeys.includes(key)) {
        mp.set(key, item[key]);
      } else if (currentKeys.includes(key)) {
        mp.set(key, current[key]);
      }
    });
    const filename = mp.has('filename') ? mp.get('filename') : '';
    const mime = mp.has('mime') ? mp.get('mime') : '';
    const valid = notEmptyString(filename, 5) && notEmptyString(mime, 3);
    const matchedSource = valid
      ? /^\w+:\/\/?/.test(filename)
        ? 'remote'
        : 'local'
      : '';
    if (valid) {
      fields.forEach(field => {
        if (!mp.has(field)) {
          switch (field) {
            case 'attributes':
              mp.set(field, {});
              break;
            case 'size':
              mp.set(field, 0);
              break;
            case 'source':
              mp.set(field, matchedSource);
              break;
            case 'type':
              mp.set(field, mime.split('/').shift());
              break;
          }
        }
      });
    }
    return Object.fromEntries(mp.entries());
  }

  hasAdminRole(user: User): boolean {
    const adminRoles = ['admin', 'superadmin'];
    return adminRoles.some(role => this.hasRole(user, role));
  }

  async isActive(userID: string): Promise<boolean> {
    const user = await this.getUser(userID);
    return user instanceof Object ? user.active : false;
  }

  async isAdminUser(userID: string): Promise<boolean> {
    const user = isValidObjectId(userID) ? await this.getUser(userID) : null;
    return user instanceof Object ? this.hasAdminRole(user) : false;
  }

  async matchesToken(userID: string, token: string): Promise<boolean> {
    const user = isValidObjectId(userID)
      ? await this.getUser(userID, ['deviceTokens'])
      : null;
    return user instanceof Object && user.deviceTokens instanceof Array
      ? user.deviceTokens.includes(token)
      : false;
  }

  async isPaidMember(userID: string): Promise<boolean> {
    const roles = await this.getRoles(userID);
    return (
      roles.length > 0 && roles.filter(rk => rk.includes('member')).length > 0
    );
  }

  async getRoles(userID: string): Promise<string[]> {
    const user = await this.userModel.findById(userID).select('active roles');
    return user instanceof Model ? (user.active ? user.roles : []) : [];
  }

  async getAdminIds(): Promise<string[]> {
    const users = await this.userModel
      .find({ roles: 'superadmin', active: true })
      .select('roles');
    return users instanceof Array
      ? users
          .filter(
            u =>
              u.roles instanceof Array && u.roles.includes('blocked') === false,
          )
          .map(u => u._id)
      : [];
  }

  async isBlocked(userID: string): Promise<boolean> {
    return await this.isValidRoleUser(userID, 'blocked');
  }

  async findWithoutCharts(start = 0, limit = 2000) {
    const users = await this.userModel
      .find({ roles: { $in: ['active'] }, test: true })
      .select('_id geo nickName gender dob placenames preferences')
      .skip(start)
      .limit(limit);
    return users;
  }

  buildNearQuery(coordsStr = '') {
    if (
      notEmptyString(coordsStr) &&
      /^-?\d+(\.\d+)?,-?\d+(\.\d+)?(\,\d+(\.\d+)?)?$/.test(coordsStr)
    ) {
      const [lat, lng, km] = coordsStr
        .split(',')
        .filter(isNumeric)
        .map(str => parseFloat(str));
      const distance = isNumeric(km) && km > 0 ? km * 1000 : 100000;
      return {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $minDistance: 0,
          $maxDistance: distance,
        },
      };
    } else {
      return {};
    }
  }

  translateAgeRange(ageRangeRef = null) {
    let min = 18;
    let max = 120;
    if (ageRangeRef instanceof Array && ageRangeRef.length > 1) {
      min = smartCastInt(ageRangeRef[0], 18);
      max = smartCastInt(ageRangeRef[1], 120);
    } else if (
      typeof ageRangeRef === 'string' &&
      /^\s*\d+(,\d+)\s*$/.test(ageRangeRef)
    ) {
      const parts = ageRangeRef.split(',');
      min = parseInt(parts.shift(), 10);
      const targetMax =
        parts.length > 0 ? parseInt(parts.shift(), 10) : min + 10;
      if (targetMax > min) {
        max = targetMax;
      } else {
        max = min + 10;
      }
    }
    const startDate = moment()
      .subtract(max, 'years')
      .toISOString();
    const endDate = moment()
      .subtract(min, 'years')
      .toISOString();
    return {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  /* translateTargetGenders(val = null) {
    const availableKeys = ['f', 'm', 'nb'];
    const opts =
      typeof val === 'string'
        ? val.split(',')
        : val instanceof Array
        ? val.filter(s => typeof s === 'string')
        : [];
    const matchedOpts = opts.filter(k => availableKeys.includes(k));
    const optList: string[][] = [matchedOpts];
    if (matchedOpts.length > 1) {
      optList.push([matchedOpts[0]]);
      optList.push([matchedOpts[1]]);
      optList.push([matchedOpts[1], matchedOpts[0]]);
    }
    if (matchedOpts.length === 3) {
      optList.push([matchedOpts[2]]);
      optList.push([matchedOpts[1], matchedOpts[2]]);
      optList.push([matchedOpts[2], matchedOpts[1]]);
      optList.push([matchedOpts[2], matchedOpts[1], matchedOpts[0]]);
      optList.push([matchedOpts[2], matchedOpts[0], matchedOpts[1]]);
      optList.push([matchedOpts[1], matchedOpts[0], matchedOpts[2]]);
      optList.push([matchedOpts[1], matchedOpts[2], matchedOpts[0]]);
      optList.push([matchedOpts[0], matchedOpts[2], matchedOpts[1]]);
    }
    return {
      $elemMatch: {
        key: { $in: ['gender', 'genders'] },
        value: { $in: optList },
      },
    };
  } */

  translateTargetGenders(val = '', singleGenderAttractionOnly = false) {
    // simplify options
    const combos = [['f', 'm'], ['m', 'f'], ['f'], ['m']];
    const maxComboNum = singleGenderAttractionOnly ? 1 : 3;
    const optList = combos.filter(
      combo => combo.includes(val) && combo.length <= maxComboNum,
    );
    return {
      $elemMatch: {
        //key: { $in: ['gender', 'genders'] },
        key: 'genders',
        value: { $in: optList },
      },
    };
  }

  /*  translateTargetGenders(val = '') {
    return {
      $elemMatch: {
        key: { $in: ['gender', 'genders'] },
        value: { elemMatch: { $eq: val } },
      },
    };
  } */

  translateAgeRangeWithin(val = null) {
    const age = smartCastInt(val, 0);
    return {
      $elemMatch: {
        key: 'age_range',
        'value.0': { $lte: age },
        'value.1': { $gte: age },
      },
    };
  }

  async fetchMaxImages(userID = '', permData = null) {
    const user = await this.userModel
      .findById(userID)
      .select('active roles profiles');
    const hasUser = user instanceof Model;
    const userObj = hasUser ? user.toObject() : {};
    const roles = hasUser ? userObj.roles : [];
    const active = hasUser ? userObj.active : false;
    const permKeys = permData instanceof Object ? Object.keys(permData) : [];
    const isAdmin = roles.some(rk => ['superadmin', 'admin'].includes(rk));
    const permRoles =
      !isAdmin && permKeys.includes('roles') && permData.roles instanceof Array
        ? permData.roles
            .filter(r => roles.includes(r.key))
            .map(r => r.permissions)
        : [];
    const permLimits =
      !isAdmin &&
      permKeys.includes('limits') &&
      permData.limits instanceof Array
        ? permData.limits.map(r => {
            const value = smartCastInt(r.value);
            return { ...r, value };
          })
        : [];

    const perms = permRoles
      .reduce((a, b) => a.concat(b), [])
      .filter(key => key.endsWith('image_upload'));
    const limits = permLimits.filter(pl => perms.includes(pl.key));
    limits.sort((a, b) => b.value - a.value);
    const limit = limits.length > 0 ? limits[0].value : 10;
    let numUploaded = 0;
    if (active && roles.length > 0 && roles.includes('blocked') === false) {
      const profiles =
        userObj.profiles instanceof Array ? userObj.profiles : [];
      profiles.forEach(pr => {
        if (
          pr instanceof Object &&
          Object.keys(pr).includes('mediaItems') &&
          pr.mediaItems instanceof Array
        ) {
          pr.mediaItems.forEach(mi => {
            const { fileType } = matchFileTypeAndMime(mi.filename, mi.mime);
            if (fileType === 'image') {
              numUploaded++;
            }
          });
        }
      });
    }
    const mayUploadMore = isAdmin || numUploaded < limit;
    return {
      limit,
      isAdmin,
      numUploaded,
      active,
      roles,
      mayUploadMore,
      valid: hasUser,
    };
  }

  mapPreferenceKey(key: string) {
    const machineName = key.toLowerCase();
    switch (machineName) {
      case 'sex':
      case 'sexuality':
        return 'gender';
      case 's_age':
      case 'sage':
      case 'search_age':
        return 'age_range';
      default:
        return machineName;
    }
  }

  // not used, as all members results are now prefiltered via a DB query
  filterByPreferences(
    items = [],
    query = null,
    prefOpts = [],
    matchByDefault = true,
  ) {
    if (query instanceof Object) {
      const excludeKeys = ['age', 'near', 'gender', 'genders', 'age_range'];
      const matchedOptions: MatchedOption[] = Object.entries(query)
        .filter(entry => excludeKeys.includes(entry[0]) == false)
        .map(entry => {
          const [key, value] = entry;
          const row = prefOpts.find(
            po => po.key === this.mapPreferenceKey(key),
          );
          return row instanceof Object ? { ...row, value } : null;
        })
        .filter(po => po instanceof Object);
      if (matchedOptions.length > 0) {
        return items.filter(item => {
          let valid = true;
          let hasMatchedPreferences = false;
          const { preferences } = item;
          if (preferences instanceof Array && preferences.length > 0) {
            hasMatchedPreferences = true;
            matchedOptions.forEach(mo => {
              const matchedPref = preferences.find(p => p.key === mo.key);
              if (matchedPref instanceof Object) {
                const validOpt = this.validatePreference(mo, matchedPref);
                if (!validOpt) {
                  valid = false;
                }
              }
            });
          }
          return matchByDefault || matchByDefault
            ? valid
            : hasMatchedPreferences && valid;
        });
      }
    }
    return items;
  }

  async fixPreferences(start = 0, limit = 1000, prefOpts: any[] = []) {
    const users = await this.list(start, limit);
    const updatedUsers = [];
    for (const user of users) {
      const { _id, preferences, gender, test } = user.toObject();
      if (preferences instanceof Array) {
        for (let i = 0; i < preferences.length; i++) {
          if (preferences[i] instanceof Object) {
            const opt = prefOpts.find(po => po.key === preferences[i].key);
            if (opt instanceof Object) {
              preferences[i].type = opt.type;
              if (preferences[i].key === 'gender' && test) {
                const isHo = Math.random() < 1 / 30;
                const isBi = Math.random() < 1 / 30;
                const first =
                  (gender === 'm' && !isHo) || (gender === 'f' && isHo)
                    ? 'f'
                    : 'm';
                const opts = [first];
                if (isBi) {
                  const sec = first === 'f' ? 'm' : 'f';
                  opts.push(sec);
                }
                preferences[i].value = opts;
              }
            }
          }
        }
        const edited = { preferences } as CreateUserDTO;
        const ud = await this.updateUser(_id, edited);
        if (ud instanceof Object) {
          updatedUsers.push(ud.user);
        }
        //updatedUsers.push(test,gender, preferences.find(po => po.key === 'gender'));
      }
    }
    return { updated: updatedUsers.length };
  }

  validatePreference(mo: MatchedOption, matchedPref: PrefKeyValue) {
    let valid = false;
    let { value } = mo;
    const itemVal = matchedPref.value;
    switch (mo.key) {
      case 'gender':
      case 'genders':
        value = value.split(',');
        break;
      case 'age_range':
        value = parseInt(value);
        break;
    }
    switch (mo.key) {
      case 'gender':
      case 'genders':
        if (itemVal instanceof Array) {
          valid = itemVal.some(v => value.includes(v));
        }
        break;
      case 'age_range':
        if (itemVal instanceof Array && itemVal.length > 1) {
          valid = value >= itemVal[0] && value <= itemVal[1];
        }
        break;
    }
    return valid;
  }

  // save / update a single user with basic data
  async savePublic(inData = null): Promise<PublicUser> {
    const obj = inData instanceof Object ? inData : {};
    const keys = Object.keys(obj);
    let publicUser = null;
    const dt = new Date();
    if (keys.includes('_id') && notEmptyString(obj._id, 16)) {
      publicUser = await this.publicUserModel.findById(obj._id);
    } else if (
      keys.includes('identifier') &&
      notEmptyString(obj.identifier, 2)
    ) {
      publicUser = await this.publicUserModel.findOne({
        identifier: obj.identifier,
      });
      if (!publicUser) {
        const idRgx = new RegExp(obj.identifier, 'i');
        publicUser = await this.publicUserModel.findOne({ identifier: idRgx });
      }
    }
    const isNew = !(publicUser instanceof Model);
    const uMap: Map<string, any> = new Map();
    keys.forEach(k => {
      if (
        [
          'nickName',
          'identifier',
          'useragent',
          'gender',
          'dob',
          'geo',
        ].includes(k)
      ) {
        uMap.set(k, obj[k]);
      }
    });
    if (
      keys.includes('preferences') &&
      obj.preferences instanceof Array &&
      obj.preferences.length > 0
    ) {
      const userObj = isNew ? {} : publicUser.toObject();
      const currentPreferences = isNew
        ? []
        : userObj.preferences instanceof Array && userObj.preferences.length > 0
        ? userObj.preferences
        : [];
      obj.preferences
        .filter(obj => obj instanceof Object)
        .forEach(pref => {
          const { key, value, type } = pref;
          if (notEmptyString(key) && isNumeric(value) && notEmptyString(type)) {
            const currIndex = currentPreferences.findIndex(
              pr => pr.key === pref.key,
            );
            const newPref = normalizedToPreference(
              { key, value: smartCastInt(value, 0) },
              type,
            );
            if (currIndex < 0) {
              currentPreferences.push(newPref);
            } else {
              currentPreferences[currIndex] = newPref;
            }
          }
        });
      uMap.set('preferences', currentPreferences);
    }
    uMap.set('modifiedAt', dt);
    if (isNew) {
      uMap.set('createdAt', dt);
    }
    let savedUser = null;
    const edited = Object.fromEntries(uMap);
    if (isNew) {
      const newUser = new this.publicUserModel(edited);
      savedUser = await newUser.save();
    } else {
      const userID = extractDocId(publicUser);
      await this.publicUserModel.findByIdAndUpdate(userID, edited);
      savedUser = await this.publicUserModel.findById(userID);
    }
    return savedUser;
  }

  async savePublicPreference(
    id = '',
    preference: PreferenceDTO,
  ): Promise<boolean> {
    let valid = false;
    const pUser = await this.publicUserModel.findById(id);
    if (pUser instanceof Model) {
      const { key } = preference;
      const userObj = pUser.toObject();
      const keys = Object.keys(userObj);
      const preferences =
        keys.includes('preferences') && userObj.preferences instanceof Array
          ? userObj.preferences
          : [];
      const prefIndex = preferences.findIndex(pr => pr.key === key);
      if (prefIndex < 0) {
        preferences.push(preference);
      } else {
        preferences[prefIndex] = preference;
      }
      await this.publicUserModel
        .findByIdAndUpdate(id, {
          preferences,
        })
        .exec();
      valid = true;
    }
    return valid;
  }

  async saveSurveyAnswers(
    userID = '',
    type = 'jungian',
    answers: AnswerDTO[] = [],
    shift = -3,
  ) {
    const adjustedAnswers = answers.map(answer => {
      const { key, value, domain, subdomain } = answer;
      const newValue = value + shift;
      return { key, value: newValue, domain, subdomain };
    });
    const dt = new Date();
    const baseSet = {
      answers: adjustedAnswers,
      createdAt: dt,
      modifiedAt: dt,
    };
    const answerSet = {
      user: userID,
      type,
      ...baseSet,
    };
    const current = await this.getAnswerSet(userID, type);
    if (current instanceof Object) {
      await this.answerSetModel.update({ userID, type }, baseSet);
    } else {
      const newSet = new this.answerSetModel(answerSet);
      await newSet.save();
    }
    return answerSet;
  }

  async deleteAnswersByUserAndType(
    userID: string,
    type = 'jungian',
  ): Promise<boolean> {
    const deleted = await this.answerSetModel.deleteOne({ user: userID, type });
    return deleted instanceof Object;
  }

  async saveSurveyAnswersKeyVals(
    userID = '',
    type = 'jungian',
    answers: KeyNumValue[] = [],
    questions: any[],
    shift = -3,
  ) {
    const adjustedAnswers = answers.map(answer => {
      const { key, value } = answer;
      const question = questions.find(q => q.key === key);
      const hasQ = question instanceof Object;
      const domain = hasQ ? smartCastString(question.domain, '') : '';
      const subdomain = hasQ ? smartCastInt(question.subdomain, 0) : 0;
      const newValue = value + shift;
      return { key, value: newValue, domain, subdomain };
    });
    const dt = new Date();
    const baseSet = {
      answers: adjustedAnswers,
      createdAt: dt,
      modifiedAt: dt,
    };
    const answerSet = {
      user: userID,
      type,
      ...baseSet,
    };
    const current = await this.getAnswerSet(userID, type);
    if (current instanceof Object) {
      await this.answerSetModel.findByIdAndUpdate(current._id, baseSet);
    } else {
      const newSet = new this.answerSetModel(answerSet);
      await newSet.save();
    }
    const analysisRows = jungianAnswersToResults(adjustedAnswers);
    const currUser = await this.getBasicById(userID, ['surveys']);
    if (currUser instanceof Object && analysisRows.length > 0) {
      const surveys = currUser.surveys instanceof Array ? currUser.surveys : [];
      const surveyIndex = surveys.findIndex(cs => cs.type === type);
      if (surveyIndex < 0) {
        surveys.push({
          type,
          values: analysisRows,
        });
      } else {
        surveys[surveyIndex].values = analysisRows;
      }
      await this.userModel.findByIdAndUpdate(
        userID,
        { surveys },
        {
          new: true,
        },
      );
    }
    return { answerSet, analysisRows, currUser };
  }

  async getAnswerSet(userID = '', type = '') {
    return await this.answerSetModel.findOne({ user: userID, type });
  }

  async getSurveyAnswers(
    userID = '',
    type = '',
    base = 1,
    scale = 5,
    asPerc = false,
  ) {
    const data = await this.getAnswerSet(userID, type);
    const offset =
      base < 0 ? 0 : base === 0 ? scale / 2 - 0.5 : scale / 2 + 0.5;
    let answers: any[] = [];
    const multiplier = asPerc
      ? base < 0
        ? 100 / (scale / 2 - 0.5)
        : 100 / (scale - 1)
      : 1;
    if (data instanceof Model) {
      const obj = data.toObject();
      if (obj.answers instanceof Array) {
        answers = obj.answers.map(row => {
          const value = (row.value + offset) * multiplier;
          return { ...row, value };
        });
      }
    }
    return answers;
  }

  async getSurveyDomainScoresAndAnswers(
    userID = '',
    type = '',
    filterAnswers = false,
  ): Promise<{ items: KeyNumValue[]; answers: any[] }> {
    const answers = await this.getSurveyAnswers(userID, type, -1, 5, true);
    const mp: Map<string, any> = new Map();
    answers.forEach(row => {
      const item = mp.has(row.domain)
        ? mp.get(row.domain)
        : { num: 0, total: 0 };
      item.total += row.value;
      item.num += 1;
      mp.set(row.domain, item);
    });
    const items = [...mp.entries()].map(([key, item]) => {
      const value = item.total / item.num;
      return { key, value };
    });
    const simpleAnswers = filterAnswers
      ? answers.map(ans => {
          const { key, value, domain, subdomain } = ans;
          const score = Math.round(value / (100 / 2)) + 3;
          return {
            key,
            score,
            domain,
            facet: subdomain,
          };
        })
      : answers;
    return { items, answers: simpleAnswers };
  }

  async getSurveyDomainScores(userID = '', type = ''): Promise<KeyNumValue[]> {
    const { items } = await this.getSurveyDomainScoresAndAnswers(userID, type);
    return items;
  }

  async getPublicUser(ref = '', refType = 'identifier') {
    const filter: Map<string, any> = new Map();
    let matchEmail = false;
    switch (refType) {
      case 'identifier':
      case 'email':
        matchEmail = true;
        break;
      case 'id':
      case '_id':
        matchEmail = false;
        break;
      default:
        matchEmail = validEmail(ref);
        break;
    }
    if (matchEmail) {
      const rgx = new RegExp(ref, 'i');
      filter.set('identifier', rgx);
    } else {
      filter.set('_id', ref);
    }
    const criteria = Object.fromEntries(filter.entries());
    return await this.publicUserModel.findOne(criteria);
  }

  async getPublicUsers(start = 0, limit = 100, criteria = null) {
    const critObj = criteria instanceof Object ? criteria : {};

    const filter: Map<string, any> = new Map();
    Object.entries(critObj).forEach(([key, val]) => {
      switch (key) {
        case 'usearch':
          const rgx = new RegExp('\\b' + val, 'i');
          filter.set('$or', [{ identifier: rgx }, { nickName: rgx }]);
          break;
        case 'active':
          filter.set('active', smartCastBool(val, true));
          break;
        case 'answers':
          filter.set('numPrefs', {
            $gt: smartCastInt(val, 0),
          });
          break;
      }
    });
    const matchCriteria = Object.fromEntries(filter.entries());
    const steps = [
      { $match: matchCriteria },
      {
        $project: {
          nickName: 1,
          identifier: 1,
          useragent: 1,
          active: 1,
          'geo.lat': 1,
          'geo.lng': 1,
          gender: 1,
          numPrefs: {
            $cond: {
              if: { $isArray: '$preferences' },
              then: { $size: '$preferences' },
              else: 0,
            },
          },
          'preferences.key': 1,
          'preferences.type': 1,
          'preferences.value': 1,
          dob: 1,
          createdAt: 1,
          modifiedAt: 1,
        },
      },
      {
        $match: matchCriteria,
      },
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
    ];

    return await this.publicUserModel.aggregate(steps);
  }

  async fetchPublicAstroPairs(start = 0, maxUsers = 100) {
    const steps = [
      {
        $match: {
          'preferences.type': 'simple_astro_pair',
        },
      },
      {
        $project: {
          identifier: 1,
          nickName: 1,
          simplePairs: {
            $filter: {
              input: '$preferences',
              as: 'pc',
              cond: { $eq: ['$$pc.type', 'simple_astro_pair'] },
            },
          },
        },
      },
      {
        $sort: {
          modifiedAt: -1,
        },
      },
      {
        $skip: start,
      },
      {
        $limit: maxUsers,
      },
    ];
    const items = await this.publicUserModel.aggregate(steps);
    return items
      .map(row => {
        return row.simplePairs
          .filter(sp => sp.value instanceof Object)
          .map(sp => {
            return {
              email: row.identifier,
              userName: row.nickName,
              key: sp.key,
              ...sp.value,
            };
          });
      })
      .reduce((a, b) => a.concat(b));
  }

  async removePublicPreference(uid: string, key: string) {
    const pu = await this.publicUserModel.findById(uid);
    const exists = pu instanceof Model;
    const result = { exists, removed: false };
    if (exists) {
      const puObj = pu.toObject();
      const { preferences } = puObj;
      if (preferences instanceof Array) {
        const prefIndex = preferences.findIndex(pr => pr.key === key);
        if (prefIndex >= 0) {
          preferences.splice(prefIndex, 1);
          const updated = await this.publicUserModel.findByIdAndUpdate(uid, {
            preferences,
          });
          if (updated) {
            result.removed = true;
          }
        }
      }
    }
    return result;
  }
}
