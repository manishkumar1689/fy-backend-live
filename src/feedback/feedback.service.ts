import { HttpService, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { AxiosResponse } from 'axios';
import {
  isoDateToMilliSecs,
  minutesAgoTs,
  yearsAgoString,
} from '../astrologic/lib/date-funcs';
import { extractDocId, extractSimplified } from '../lib/entities';
import { notEmptyString, validISODateString } from '../lib/validators';
import { CreateFlagDTO } from './dto/create-flag.dto';
import { Feedback } from './interfaces/feedback.interface';
import { Flag, SimpleFlag } from './interfaces/flag.interface';
import {
  filterLikeabilityFlags,
  FlagResult,
  mapFlagItems,
  mapLikeability,
  mapUserFlag,
  UserFlagSet,
} from '../lib/notifications';
import { smartCastInt } from '../lib/converters';
import { BlockRecord } from './lib/interfaces';
import { chatApi } from '../.config';
const { ObjectId } = Types;

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel('Feedback') private readonly feedbackModel: Model<Feedback>,
    @InjectModel('Flag') private flagModel: Model<Flag>,
    private http: HttpService,
  ) {}

  getHttp(url: string): Promise<AxiosResponse> {
    return this.http.get(url).toPromise();
  }

  async getByTargetUserOrKey(userRef = '', keyRef = '', otherCriteria = null) {
    const criteria = this.buildFilterCriteria(userRef, keyRef, otherCriteria);
    return await this.flagModel.find(criteria).select({ _id: 0, __v: 0 });
  }

  async countByTargetUserOrKey(
    userRef = '',
    keyRef = '',
    otherCriteria = null,
  ) {
    const criteria = this.buildFilterCriteria(userRef, keyRef, otherCriteria);
    return await this.flagModel.count(criteria);
  }

  async getAllbySourceUser(uid: string) {
    const criteria = this.buildFilterCriteria('', '', { uid });
    return await this.flagModel.find(criteria);
  }

  async getAllbyTargetUser(user: string) {
    const criteria = this.buildFilterCriteria(user, '');
    return await this.flagModel.find(criteria);
  }

  async getRatings(user: string, yearsAgo = 1) {
    const timeAgo = yearsAgo * 365.25 * 24 * 60 * 60 * 1000;
    const startTsMs = new Date().getTime() - timeAgo;
    const startDate = new Date(startTsMs);
    const criteria = {
      key: 'likeability',
      $or: [{ targetUser: user }, { user }],
      modifiedAt: {
        $gte: startDate,
      },
    };
    const rows = await this.flagModel.find(criteria).select({
      user: 1,
      targetUser: 1,
      value: 1,
      modifiedAt: 1,
    });
    return rows
      .filter(row => row instanceof Model && row.user)
      .map(row => {
        return {
          ...row.toObject(),
          isFrom: row.user.toString() === user,
        };
      });
  }

  async listAll(start = 0, limit = 100, criteria: any = null) {
    const matchedCriteria = this.translateFbCriteria(criteria);
    const steps = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'u',
        },
      },
      {
        $unwind: '$u',
      },
      {
        $match: matchedCriteria,
      },
      {
        $project: {
          _id: 1,
          key: 1,
          reason: 1,
          text: 1,
          active: 1,
          deviceDetails: 1,
          mediaItems: 1,
          createdAt: 1,
          modifiedAt: 1,
          targetUser: 1,
          user: 1,
          userId: '$u._id',
          email: '$u.identifier',
          fullName: '$u.fullName',
          nickName: '$u.nickName',
          roles: '$u.roles',
          userActive: '$u.active',
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
        $limit: limit,
      },
    ];
    return await this.feedbackModel.aggregate(steps);
  }

  async countAll(criteria: any = null) {
    const matchedCriteria = this.translateFbCriteria(criteria);
    const steps = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'u',
        },
      },
      {
        $unwind: '$u',
      },
      {
        $match: matchedCriteria,
      },
      { $group: { _id: null, count: { $sum: 1 } } },
    ];
    const rows: any[] = await this.feedbackModel.aggregate(steps);
    if (
      rows instanceof Array &&
      rows.length > 0 &&
      rows[0] instanceof Object &&
      rows[0].count > 0
    ) {
      return rows[0].count;
    } else {
      return 0;
    }
  }

  translateFbCriteria(criteria: any = null) {
    const keys = criteria instanceof Object ? Object.keys(criteria) : [];
    const filter: Map<string, any> = new Map();
    if (keys.length < 1) {
      filter.set('createdAt', {
        $gt: new Date('2020-01-01T00:00:00'),
      });
    } else {
      for (const k of keys) {
        switch (k) {
          case 'key':
            filter.set('key', criteria.key);
            break;
          case 'user':
            filter.set('user', ObjectId(criteria.user));
            break;
        }
      }
    }
    return Object.fromEntries(filter);
  }

  async getFeedbackTypes() {
    const steps = [
      {
        $group: { _id: '$key', num: { $sum: 1 } },
      },
    ];
    const rows = await this.feedbackModel.aggregate(steps);
    return rows instanceof Array
      ? rows.map(row => {
          const { _id, num } = row;
          const words = _id.split('_').map(w => {
            let str = '';
            if (w.length > 0) {
              str = w.substring(0, 1).toUpperCase();
              if (w.length > 1) {
                str += w.substring(1);
              }
            }
            return str;
          });
          const title = words.join(' ');
          return { key: _id, title, num };
        })
      : [];
  }

  async saveFeedback(
    data: any = null,
    optionalText = false,
    defaultText = '-',
  ): Promise<string> {
    if (data instanceof Object) {
      const dt = new Date();
      const {
        user,
        targetUser,
        key,
        reason,
        text,
        deviceDetails,
        mediaItems,
      } = data;
      const hasText = notEmptyString(text);
      const textContent =
        optionalText && !hasText ? '-' : hasText ? text : defaultText;
      if (
        isValidObjectId(user) &&
        notEmptyString(key) &&
        notEmptyString(textContent)
      ) {
        const edited: any = {
          user,
          key,
          reason,
          text: textContent,
          createdAt: dt,
          modifiedAt: dt,
        };
        if (notEmptyString(targetUser) && isValidObjectId(targetUser)) {
          edited.targetUser = targetUser;
        }
        if (notEmptyString(deviceDetails)) {
          edited.deviceDetails = deviceDetails;
        }
        if (
          mediaItems instanceof Array &&
          mediaItems.length > 0 &&
          mediaItems[0] instanceof Object
        ) {
          edited.mediaItems = mediaItems.filter(
            mi => mi instanceof Object && notEmptyString(mi.filename, 7),
          );
        }
        const fb = new this.feedbackModel(edited);
        const fbRecord = await fb.save();
        if (fbRecord instanceof Model) {
          fbRecord.save();
          return fbRecord._id.toString();
        }
      }
    }
    return '-';
  }

  async getAllUserInteractions(
    user: string,
    startDate = null,
    otherUserIds = [],
  ): Promise<UserFlagSet> {
    const dt = validISODateString(startDate)
      ? startDate
      : typeof startDate === 'number'
      ? yearsAgoString(startDate)
      : yearsAgoString(1);

    const criteria: Map<string, any> = new Map();
    if (otherUserIds.length > 0) {
      criteria.set('$or', [
        { user: user, targetUser: { $in: otherUserIds } },
        { targetUser: user, user: { $in: otherUserIds } },
      ]);
    } else {
      criteria.set('$or', [{ user: user }, { targetUser: user }]);
    }
    criteria.set('active', true);
    criteria.set('modifiedAt', { $gte: new Date(dt) });
    const criteriaObj = Object.fromEntries(criteria.entries());

    const rows = await this.flagModel
      .find(criteriaObj)
      .select({ _id: 0, __v: 0, isRating: 0, options: 0, active: 0 })
      .sort({ modifiedAt: -1 });

    const hasRows = rows instanceof Array && rows.length > 0;
    const userID = user.toString();
    const likeKey = 'likeability';
    const excludeKeys = [likeKey];
    const likeRows = rows.filter(row => row.key === likeKey);
    likeRows.sort(
      (a, b) =>
        isoDateToMilliSecs(b.modifiedAt) - isoDateToMilliSecs(a.modifiedAt),
    );
    const hasLikeRows = likeRows.length > 0;

    const likeability = {
      from: hasLikeRows
        ? likeRows
            .filter(row => row.user.toString() === userID)
            .map(row => mapUserFlag(row, false, true))
        : [],
      to: hasLikeRows
        ? likeRows
            .filter(row => row.targetUser.toString() === userID)
            .map(row => mapUserFlag(row, true, true))
        : [],
    };
    return {
      from: hasRows
        ? rows
            .filter(
              row =>
                row.user.toString() === userID &&
                excludeKeys.includes(row.key) === false,
            )
            .map(row => mapUserFlag(row))
        : [],
      to: hasRows
        ? rows
            .filter(
              row =>
                row.targetUser.toString() === userID &&
                excludeKeys.includes(row.key) === false,
            )
            .map(row => mapUserFlag(row, true))
        : [],
      likeability,
    };
  }

  async isBlocked(
    currUserID = '',
    otherUserID = '',
  ): Promise<{ blocked: boolean; from: boolean; to: boolean }> {
    const blockFlags = await this.flagModel
      .find({
        key: 'blocked',
        $or: [
          { user: currUserID, targetUser: otherUserID },
          { user: otherUserID, targetUser: currUserID },
        ],
      })
      .limit(2);
    const result = { blocked: false, from: false, to: false };
    if (blockFlags.length > 0) {
      result.blocked = true;
      result.from = blockFlags.some(row => row.user.toString() === currUserID);
      result.to = blockFlags.some(
        row => row.targetUser.toString() === currUserID,
      );
    }
    return result;
  }

  async blockOtherUser(currUserID = '', otherUserID = '') {
    const current = await this.isBlocked(currUserID, otherUserID);
    const result = {
      valid: isValidObjectId(currUserID) && isValidObjectId(otherUserID),
      blocked: current.blocked,
      byOtherUser: current.to,
    };
    if (!current.from && result.valid) {
      const nowDt = new Date();
      const fieldData = {
        key: 'blocked',
        user: currUserID,
        targetUser: otherUserID,
        value: true,
        type: 'boolean',
        isRating: true,
        createdAt: nowDt,
        modifiedAt: nowDt,
      };
      const newFlag = new this.flagModel(fieldData);
      const saved = await newFlag.save();
      if (saved instanceof Model) {
        result.valid = true;
        result.blocked = true;
        this.syncBlockWithChat(currUserID, otherUserID, true);
      }
    }
    return result;
  }

  async unblockOtherUser(currUserID = '', otherUserID = '') {
    const current = await this.isBlocked(currUserID, otherUserID);
    const result = {
      valid: false,
      blocked: current.blocked,
      byOtherUser: current.to,
    };
    if (current.blocked) {
      const deleted = await this.flagModel.deleteOne({
        key: 'blocked',
        user: currUserID,
        targetUser: otherUserID,
      });
      if (deleted.ok) {
        result.valid = true;
        result.blocked = current.to;
        this.syncBlockWithChat(currUserID, otherUserID, false);
      }
    }
    return result;
  }

  async syncBlockWithChat(currUserID = '', otherUserID = '', startMode = true) {
    const mode = startMode ? 'start' : 'end';
    const url = [chatApi, 'set-block', currUserID, otherUserID, mode].join('/');
    this.getHttp(url);
  }

  async getBlocksByUser(
    userID = '',
    mode = 'both',
    targetID = '',
  ): Promise<BlockRecord[]> {
    const orConditions = [];
    const hasTarget = isValidObjectId(targetID);
    const userObjId = ObjectId(userID);
    const targetObjId = hasTarget ? ObjectId(targetID) : null;
    if (['both', 'all', 'to'].includes(mode)) {
      const toConds = hasTarget
        ? { user: userObjId, targetUser: targetObjId }
        : { user: userObjId };
      orConditions.push(toConds);
    }
    if (['both', 'all', 'from'].includes(mode)) {
      const fromConds = hasTarget
        ? { targetUser: userObjId, user: targetObjId }
        : { targetUser: userObjId };
      orConditions.push(fromConds);
    }
    const items = await this.flagModel.find({
      key: 'blocked',
      $or: orConditions,
    });
    const records: BlockRecord[] = [];
    const uids: string[] = [];
    for (const item of items) {
      const record = {
        user: '',
        mode: 'none',
        mutual: false,
        createdAt: item.createdAt,
      };
      if (item.user.toString() !== userID) {
        record.user = item.user.toString();
        record.mode = 'from';
        record.mutual = items.some(
          row =>
            row.user.toString() === userID &&
            row.targetUser.toString() === record.user,
        );
      } else {
        record.user = item.targetUser.toString();
        record.mode = 'to';
        record.mutual = items.some(
          row =>
            row.user.toString() === record.user &&
            row.targetUser.toString() === userID,
        );
      }
      if (uids.includes(record.user) === false) {
        records.push(record);
        uids.push(record.user);
      }
    }
    return records;
  }

  async fetchByLikeability(
    userId = '',
    startDate = null,
    refNum = 1,
    gte = false,
    mutualMode = 0,
  ) {
    const valueFilter = gte ? { $gte: refNum } : refNum;
    const dt = validISODateString(startDate)
      ? startDate
      : typeof startDate === 'number'
      ? yearsAgoString(startDate)
      : yearsAgoString(1);
    const criteriaObj = {
      key: 'likeability',
      value: valueFilter,
      modifiedAt: { $gte: new Date(dt) },
    };
    const criteriaObj1 = { ...criteriaObj, targetUser: userId };
    const rows = await this.flagModel
      .find(criteriaObj1)
      .select({
        _id: 0,
        __v: 0,
        type: 0,
        isRating: 0,
        options: 0,
        active: 0,
        targetUser: 0,
      })
      .sort({ modifiedAt: -1 });
    const filterMutual = mutualMode !== 0;
    if (filterMutual) {
      const mutualValueFilter =
        mutualMode > 0 ? valueFilter : { $nin: [0, -1, -2] };
      const criteriaObj2 = {
        targetUser: { $in: rows.map(r => r.user) },
        user: userId,
        value: mutualValueFilter,
      };
      const mutualRows = await this.flagModel
        .find(criteriaObj2)
        .select({
          _id: 0,
          __v: 0,
          key: 0,
          type: 0,
          isRating: 0,
          options: 0,
          active: 0,
        })
        .sort({ modifiedAt: -1 });
      const mutualIds = mutualRows.map(r => r.targetUser.toString());
      // match and exclude ids of users that have been rejected (passed) 3 times or more
      const criteriaObj3 = {
        targetUser: { $in: rows.map(r => r.user) },
        user: userId,
        value: { $lte: -3 },
      };
      const rejectedRows = await this.flagModel
        .find(criteriaObj3)
        .select('targetUser');
      const rejectedIds =
        rejectedRows.length > 0
          ? rejectedRows.map(r => r.targetUser.toString())
          : [];
      const frs = rows
        .filter(r => rejectedIds.includes(r.user.toString()) === false)
        .map(r => {
          const isMutual = mutualIds.includes(r.user.toString());
          const obj = r.toObject();
          let modifiedAt = obj.modifiedAt;
          if (isMutual && modifiedAt instanceof Date) {
            const mRow = mutualRows.find(
              r => r.targetUser.toString() === obj.user.toString(),
            );
            if (mRow instanceof Object && mRow.modifiedAt instanceof Date) {
              if (modifiedAt.getTime() < mRow.modifiedAt.getTime()) {
                modifiedAt = mRow.modifiedAt;
              }
            }
          }
          return { ...obj, modifiedAt, isMutual };
        })
        .filter(r => r.isMutual === mutualMode > 0);
      frs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
      return frs;
    } else {
      return rows;
    }
  }

  async fetchLikeSortOrder(
    userId = '',
    otherIds: string[] = [],
  ): Promise<{ id: string; dt: Date; value: string }[]> {
    const criteria = {
      key: 'likeability',
      user: userId,
      targetUser: {
        $in: otherIds,
      },
    };
    const rows = await this.flagModel.find(criteria).sort({ modifiedAt: -1 });
    return rows.map(m => {
      return {
        id: m.targetUser.toString(),
        dt: m.modifiedAt,
        value: mapLikeability(m.value),
      };
    });
  }

  async countLikesGiven(userID = '', likeStartTs = 0) {
    const startDt = new Date(likeStartTs);
    return await this.flagModel.count({
      user: userID,
      value: { $gt: 0 },
      modifiedAt: { $gte: startDt },
    });
  }

  async fetchFilteredUserInteractions(
    userId = '',
    notFlags = [],
    trueFlags = [],
    preFetchFlags = false,
    searchMode = false,
    repeatInterval = 0,
  ) {
    const userFlags = preFetchFlags
      ? await this.getAllUserInteractions(userId, 1, [])
      : { to: [], from: [], likeability: { to: [], from: [] } };
    const hasNotFlags = notFlags instanceof Array && notFlags.length > 0;
    const hasTrueFlags = trueFlags instanceof Array && trueFlags.length > 0;
    const notFlagItems = hasNotFlags
      ? notFlags
          .filter(k => k.startsWith('notliked') === false)
          .map(mapFlagItems)
      : [];
    const trueFlagItems = hasTrueFlags ? trueFlags.map(mapFlagItems) : [];
    const filterLiked2 = preFetchFlags && notFlags.includes('notliked2');
    const filterLiked1 = preFetchFlags && notFlags.includes('notliked');
    const filterByLiked = filterLiked2 || filterLiked1;
    const likeMode = trueFlags.includes('liked1') && !searchMode;
    const superlikeMode = trueFlags.includes('liked2') && !searchMode;
    const { from, to, likeability } = userFlags;
    const fromLikeFlags = likeability.from.map(fi => {
      return { ...fi, key: 'likeability' };
    });
    const toLikeFlags = likeability.to.map(fi => {
      return { ...fi, key: 'likeability' };
    });
    const fromFlags = preFetchFlags ? [...fromLikeFlags, ...from] : [];

    const toFlags = preFetchFlags ? [...toLikeFlags, ...to] : [];

    const excludeLikedMinVal = filterLiked2 ? 2 : filterLiked1 ? 1 : 3;
    if (notFlagItems.length < 1 && !searchMode) {
      // notFlagItems.push({ key: 'passed3', value: -2, op: 'lt' } );
    }
    const excludedRecent = repeatInterval > 0;
    const excludeAllStartTs = excludedRecent
      ? minutesAgoTs(repeatInterval)
      : -1;
    const excludedIds =
      !preFetchFlags || searchMode
        ? fromFlags
            .filter(flag =>
              filterLikeabilityFlags(flag, notFlagItems, excludeAllStartTs),
            )
            .map(flag => flag.user)
        : [];
    if (fromFlags instanceof Array && toFlags instanceof Array) {
      [...fromFlags, ...toFlags].forEach(fl => {
        if (fl.key === 'blocked') {
          excludedIds.push(fl.user);
        }
      });
    }
    const includedIds =
      !preFetchFlags || searchMode || likeMode || superlikeMode
        ? fromFlags
            .filter(flag => filterLikeabilityFlags(flag, trueFlagItems))
            .map(flag => flag.user)
        : [];

    const extraExcludedIds = filterByLiked
      ? toFlags.filter(fl => fl.value >= excludeLikedMinVal).map(fl => fl.user)
      : [];
    if (filterByLiked && searchMode) {
      likeability.from.forEach(fl => {
        if (fl.value > 0 || fl.value <= -3) {
          extraExcludedIds.push(fl.user);
        }
      });
    }
    //const extraExcludedIds = filterByLiked? toFlags.filter(fl => fl.value >= excludeLikedMinVal).map(fl => fl.user) : [];
    // exclude people who have the current user 3 times
    if (searchMode && likeability.to instanceof Array) {
      likeability.to.forEach(row => {
        if (row.value <= -3 && extraExcludedIds.includes(row.user) === false) {
          extraExcludedIds.push(row.user);
        }
      });
    }
    if (extraExcludedIds.length > 0) {
      extraExcludedIds.forEach(id => {
        excludedIds.push(id);
      });
    }
    return { userFlags, excludedIds, includedIds };
  }

  async rankByLikeability(
    userIds: string[] = [],
    maxDaysActiveAgo = 14,
    skip = 0,
    limit = 10000,
  ) {
    const filter: Map<string, any> = new Map();
    filter.set('key', 'likeability');
    filter.set('value', { $gt: 0 });
    if (userIds.length > 0) {
      filter.set('targetUser', {
        $in: userIds,
      });
    }
    const criteria = Object.fromEntries(filter.entries());
    const rows = await this.flagModel
      .find(criteria)
      .select('value targetUser')
      .sort({ modifiedAt: -1 })
      .skip(skip)
      .limit(limit);
    const lMap: Map<string, number> = new Map();
    for (const row of rows) {
      const { targetUser } = row;
      if (targetUser) {
        const uid = targetUser.toString();
        let vl = lMap.has(uid) ? lMap.get(uid) : 0;
        vl += smartCastInt(row.value, 1);
        const daysAgo = await this.lastFlagSentDaysAgo(uid);
        if (daysAgo <= maxDaysActiveAgo) {
          lMap.set(uid, vl);
        }
      }
    }
    const entries = [...lMap.entries()];
    entries.sort((a, b) => b[1] - a[1]);
    return Object.fromEntries(entries);
  }

  async lastFlagSentDaysAgo(userId = '') {
    const lastItems = await this.flagModel
      .find({ user: userId })
      .select('modifiedAt')
      .sort({ modifiedAt: -1 })
      .skip(0)
      .limit(1);
    if (lastItems.length > 0) {
      const { modifiedAt } = lastItems[0];
      if (modifiedAt instanceof Date) {
        const currTs = new Date().getTime();
        const ts = lastItems[0].modifiedAt.getTime();
        return (currTs - ts) / (24 * 60 * 60 * 1000);
      }
    }
    return -1;
  }

  async rankByActivity(userIds: string[] = [], weeks = 2) {
    const oneWeek = weeks * 7 * 24 * 60 * 60 * 1000;
    const nowTs = new Date().getTime();
    const oneWeekAgo = new Date(nowTs - oneWeek);
    const filter: Map<string, any> = new Map();
    filter.set('modifiedAt', {
      $gt: oneWeekAgo,
    });
    if (userIds.length > 0) {
      filter.set('user', {
        $in: userIds,
      });
    }
    const criteria = Object.fromEntries(filter.entries());
    const rows = await this.flagModel.find(criteria).select('user modifiedAt');
    const lMap: Map<string, number> = new Map();
    const currTs = new Date().getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysAgoToPoints = (daysAgo: number, weeks = 1) => {
      const multiplier = weeks * 14;
      return Math.ceil(multiplier / daysAgo);
    };
    for (const row of rows) {
      const { user, modifiedAt } = row;
      if (user) {
        const uid = user.toString();
        const ts = modifiedAt.getTime();
        const daysAgo = (currTs - ts) / msPerDay;
        const points = daysAgoToPoints(daysAgo, weeks);
        const vl = lMap.has(uid) ? lMap.get(uid) + points : points;
        lMap.set(uid, vl);
      }
    }
    const entries = [...lMap.entries()];
    entries.sort((a, b) => b[1] - a[1]);
    return Object.fromEntries(entries);
  }

  async getMemberSet(user: string, uid: string) {
    const ratingCriteria = { targetUser: user, isRating: true, active: true };
    const ratingRows = await this.flagModel.find(ratingCriteria).select({
      _id: 0,
      __v: 0,
      createdAt: 0,
      modifiedAt: 0,
      user: 0,
      targetUser: 0,
    });
    const flagCriteria = { targetUser: user, user: uid, active: true };
    const flags = await this.flagModel
      .find(flagCriteria)
      .select({ _id: 0, __v: 0, user: 0, targetUser: 0 });
    const otherFlagCriteria = { targetUser: uid, user, active: true };
    const otherFlags = await this.flagModel
      .find(otherFlagCriteria)
      .select({ _id: 0, __v: 0, user: 0, targetUser: 0 });
    const ratingsMap: Map<string, { total: number; count: number }> = new Map();
    for (const row of ratingRows) {
      const currRow = ratingsMap.get(row.key);
      const hasRow = currRow instanceof Object;
      const dblVal = hasRow ? currRow.total : 0;
      const count = hasRow ? currRow.count + 1 : 1;
      ratingsMap.set(row.key, {
        total: row.value + dblVal,
        count,
      });
    }

    return {
      ratings: Object.fromEntries(ratingsMap.entries()),
      flags,
      otherFlags,
    };
  }

  async deleteFlag(key: string, u1: string, u2: string, mutual = false) {
    const result = await this.flagModel.findOneAndDelete({
      key,
      user: u1,
      targetUser: u2,
    });
    let result2 = null;
    if (mutual) {
      result2 = await this.flagModel.findOneAndDelete({
        key,
        user: u2,
        targetUser: u1,
      });
    }
    return { result, result2 };
  }

  // Only call this method when deleting a user altogether
  async deleteByFromUser(userID = '') {
    let result: any = { ok: 0, n: 0, deletedCount: 0 };
    if (isValidObjectId(userID)) {
      result = await this.flagModel
        .deleteMany({
          user: userID,
        })
        .exec();
    }
    return result;
  }

  buildFilterCriteria(userRef = '', keyRef = '', otherCriteria = null) {
    const filterByUser = notEmptyString(userRef, 8);
    const filterByKey = notEmptyString(keyRef, 2);
    const filter = new Map<string, any>();
    filter.set('active', true);
    if (filterByKey) {
      filter.set('key', keyRef);
    }
    if (filterByUser) {
      filter.set('targetUser', userRef);
    }
    if (otherCriteria instanceof Object) {
      Object.entries(otherCriteria).forEach(entry => {
        const [key, val] = entry;
        switch (key) {
          case 'after':
            filter.set('modifiedAt', {
              $gte: val,
            });
            break;
          case 'uid':
            filter.set('user', val);
            break;
        }
      });
    }
    return Object.fromEntries(filter.entries());
  }

  async getFriends(
    userId = '',
  ): Promise<{
    friendIds: string[];
    sentIds: string[];
    receivedIds: string[];
  }> {
    const criteria: any = {
      key: 'friend',
      $or: [{ user: userId }, { targetUser: userId }],
    };
    const rows = await this.flagModel.find(criteria);
    const friendIds: string[] = [];
    const sentIds: string[] = [];
    const receivedIds: string[] = [];
    const fromIds = rows
      .map(row => row.user.toString())
      .filter(uid => uid !== userId);
    const toIds = rows
      .map(row => row.targetUser.toString())
      .filter(uid => uid !== userId);
    if (rows.length > 0) {
      rows.forEach(row => {
        const fromId = row.user.toString();
        const toId = row.targetUser.toString();
        if (fromId === userId) {
          if (fromIds.includes(toId)) {
            if (friendIds.includes(toId) === false) {
              friendIds.push(toId);
            }
          } else {
            sentIds.push(toId);
          }
        } else if (toId === userId) {
          if (toIds.includes(fromId)) {
            if (friendIds.includes(fromId) === false) {
              friendIds.push(fromId);
            }
          } else {
            receivedIds.push(fromId);
          }
        }
      });
    }
    return { friendIds, sentIds, receivedIds };
  }

  async handleFriendRequest(
    fromId: string,
    toId: string,
    value = 1,
  ): Promise<number> {
    const criteria = { key: 'friend', user: fromId, targetUser: toId };
    const current = await this.flagModel.findOne(criteria);
    if (current instanceof Object) {
      return parseInt(current.value, 10);
    } else {
      const nowDt = new Date();
      const fieldData = {
        ...criteria,
        value,
        type: 'int',
        isRating: true,
        createdAt: nowDt,
        modifiedAt: nowDt,
      };
      const newFlag = new this.flagModel(fieldData);
      newFlag.save();
      return fieldData.value;
    }
  }

  async sendFriendRequest(fromId: string, toId: string): Promise<number> {
    return await this.handleFriendRequest(fromId, toId, 1);
  }

  async acceptFriendRequest(
    acceptingUserId: string,
    referrerId: string,
  ): Promise<number> {
    return await this.handleFriendRequest(acceptingUserId, referrerId, 2);
  }

  async unfriend(fromId: string, toId: string): Promise<number> {
    const criteria = { key: 'friend', user: fromId, targetUser: toId };
    const deleted = await this.flagModel.deleteOne(criteria);
    if (deleted instanceof Object) {
      return deleted.deletedCount;
    } else {
      return 0;
    }
  }

  async saveFlag(flagDto: CreateFlagDTO | SimpleFlag) {
    const { user, targetUser, key, type, value, counted, isRating } = flagDto;
    const uid = user;
    const criteria = this.buildFilterCriteria(targetUser, key, { uid });
    const fbItem = await this.flagModel.findOne(criteria);
    const dt = new Date();
    let data: any = null;
    if (fbItem instanceof Object) {
      const newFields = {
        value,
        isRating: isRating === true,
        modifiedAt: dt,
      };
      const fbId = extractDocId(fbItem);
      data = await this.flagModel.findByIdAndUpdate(fbId, newFields);
    } else {
      const fields = {
        user: uid,
        targetUser,
        key,
        type,
        value,
        counted: counted !== false,
        isRating: isRating === true,
        createdAt: dt,
        modifiedAt: dt,
      };
      const newFB = new this.flagModel(fields);
      data = await newFB.save();
    }
    const hasData = data instanceof Object;
    const simpleResult = hasData ? extractSimplified(data, ['_id', '__v', 'active']) : { };
    const result: FlagResult = hasData
      ? { ...simpleResult, valid: true }
      : { valid: false, value: 0 };
    if (hasData) {
      result.value = value;
    }
    return result;
  }

  async saveLikeability(from = '', to = '', intValue = 0, isCounted = true): Promise<{flag: FlagResult; flagData: CreateFlagDTO }> {
    const flagData = {
      user: from,
      targetUser: to,
      key: 'likeability',
      type: 'int',
      counted: isCounted,
      isRating: true,
      value: intValue,
    } as CreateFlagDTO;
    const flag = await this.saveFlag(flagData);
    return { flag, flagData };
  }

  async countRecentLikeability(userId: string, refNum = 1, likeStartTs = -1) {
    const nowTs = new Date().getTime();
    const sinceTs = likeStartTs > 0 ? likeStartTs : nowTs - 24 * 60 * 60 * 1000;
    const dateAgo = new Date(sinceTs);
    const modifiedAt = {
      $gte: dateAgo,
    };
    const criteria = {
      key: 'likeability',
      user: userId,
      value: refNum,
      modifiedAt,
      counted: true
    };
    return await this.flagModel.count(criteria);
  }

  async prevSwipe(userId: string, otherUserId = '') {
    const criteria = {
      key: 'likeability',
      user: userId,
      targetUser: otherUserId,
    };
    const flag = await this.flagModel
      .findOne(criteria)
      .select('-_id key value modifiedAt');
    return flag instanceof Model
      ? { ...flag.toObject(), valid: true }
      : { valid: false, value: 0 };
  }

  matchLikeabilityKey(keyRef = 'like') {
    const key = keyRef.toLowerCase();
    switch (key) {
      case 'like':
        return 1;
      case 'superlike':
        return 2;
      case 'pass':
        return 0;
      default:
        return -5;
    }
  }

  async activateUser(user: string, active = true) {
    const criteria = this.buildFilterCriteria(user, '');
    return await this.flagModel.updateMany(criteria, {
      active,
    });
  }

  async deactivateUser(user: string) {
    return this.activateUser(user, false);
  }
}
