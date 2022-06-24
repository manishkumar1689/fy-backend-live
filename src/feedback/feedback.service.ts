import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { minutesAgoTs, yearsAgoString } from '../astrologic/lib/date-funcs';
import { extractDocId, extractSimplified } from '../lib/entities';
import { notEmptyString, validISODateString } from '../lib/validators';
import { CreateFlagDTO } from './dto/create-flag.dto';
import { Feedback } from './interfaces/feedback.interface';
import { Flag, SimpleFlag} from './interfaces/flag.interface';
import {
  filterLikeabilityFlags,
  mapFlagItems,
  mapUserFlag,
  UserFlagSet,
} from '../lib/notifications';
import { smartCastInt } from '../lib/converters';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel('Feedback') private readonly feedbackModel: Model<Feedback>,
    @InjectModel('Flag') private flagModel: Model<Flag>,
  ) {}

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
    criteria.set('modifiedAt', { $gte: dt });
    const criteriaObj = Object.fromEntries(criteria.entries());
    const rows = await this.flagModel
      .find(criteriaObj)
      .select({ _id: 0, __v: 0, isRating: 0, options: 0, active: 0 });

    const hasRows = rows instanceof Array && rows.length > 0;
    const userID = user.toString();
    const likeKey = 'likeability';
    const excludeKeys = [likeKey];
    const likeRows = rows.filter(row => row.key === likeKey);
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
      modifiedAt: { $gte: dt },
    };
    const criteriaObj1 = { ...criteriaObj, targetUser: userId };
    const rows = await this.flagModel.find(criteriaObj1).select({
      _id: 0,
      __v: 0,
      type: 0,
      isRating: 0,
      options: 0,
      active: 0,
      targetUser: 0,
    });
    const filterMutual = mutualMode !== 0;
    if (filterMutual) {
      const mutualValueFilter = mutualMode > 0 ? valueFilter : { $ne: 0 };
      const criteriaObj2 = {
        targetUser: { $in: rows.map(r => r.user) },
        user: userId,
        value: mutualValueFilter,
      };
      const mutualRows = await this.flagModel.find(criteriaObj2).select({
        _id: 0,
        __v: 0,
        key: 0,
        type: 0,
        isRating: 0,
        options: 0,
        active: 0,
      });
      const mutualIds = mutualRows.map(r => r.targetUser.toString());
      // match and exclude ids of users that have been rejected (passed) 3 times or more
      const criteriaObj3 = {
        targetUser: { $in: rows.map(r => r.user) },
        user: userId,
        value: { $lte: -3 },
      };
      const rejectedRows = await this.flagModel.find(criteriaObj3).select('targetUser');
      const rejectedIds = rejectedRows.length > 0 ? rejectedRows.map(r => r.targetUser.toString()) : [];
      return rows.filter(r => rejectedIds.includes(r.user.toString()) === false).map(r => {
        const isMutual = mutualIds.includes(r.user.toString());
        return { ...r.toObject(), isMutual };
      }).filter(r => r.isMutual === mutualMode > 0);
    } else {
      return rows;
    }
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
    repeatInterval = 0
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

  async saveFlag(flagDto: CreateFlagDTO | SimpleFlag) {
    const { user, targetUser, key, type, value, isRating } = flagDto;
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
        isRating: isRating === true,
        createdAt: dt,
        modifiedAt: dt,
      };
      const newFB = new this.flagModel(fields);
      data = await newFB.save();
    }
    const hasData = data instanceof Object;
    const result = hasData
      ? extractSimplified(data, ['_id', '__v', 'active'])
      : { valid: false, value: 0 };
    if (hasData) {
      result.value = value;
    }
    return result;
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
