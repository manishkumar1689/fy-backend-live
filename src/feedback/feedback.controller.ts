import {
  Controller,
  Get,
  Res,
  Req,
  HttpStatus,
  Post,
  Body,
  Query,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { Request } from 'express';
import { FeedbackService } from './feedback.service';
import { UserService } from '../user/user.service';
import { SettingService } from '../setting/setting.service';
import { CreateFlagDTO } from './dto/create-flag.dto';
import { pushMessage } from '../lib/notifications';
import { notEmptyString } from '../lib/validators';
import { SwipeDTO } from './dto/swipe.dto';
import { sanitize, smartCastInt } from '../lib/converters';
import { objectToMap } from '../lib/entities';
import { isValidObjectId } from 'mongoose';
import { fromBase64 } from '../lib/hash';
import { SnippetService } from '../snippet/snippet.service';
import { CreateFeedbackDTO } from './dto/create-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private feedbackService: FeedbackService,
    private userService: UserService,
    private settingService: SettingService,
    private snippetService: SnippetService,
  ) {}

  @Get('list-by-target/:user?/:key?')
  async getTargetUsersByCriteria(
    @Res() res,
    @Param('user') user,
    @Param('key') key,
    @Req() request: Request,
  ) {
    const { query } = request;
    const data = await this.feedbackService.getByTargetUserOrKey(
      user,
      key,
      query,
    );
    return res.json(data);
  }

  @Get('flags-by-user/:user?')
  async getAllFlagsByUser(@Res() res, @Param('user') user) {
    const data = await this.feedbackService.getAllUserInteractions(user);
    return res.json(data);
  }

  @Get('member-set/:user/:uid')
  async getMemberRatingsAndFlags(
    @Res() res,
    @Param('user') user,
    @Param('uid') uid,
  ) {
    const data = await this.feedbackService.getMemberSet(user, uid);
    return res.json(data);
  }

  @Post('save-flag')
  async saveFlag(@Res() res, @Body() createFlagDTO: CreateFlagDTO) {
    const data = await this.feedbackService.saveFlag(createFlagDTO);
    return res.json(data);
  }

  @Post('save-member-flag')
  async saveMemberFlag(@Res() res, @Body() createFlagDTO: CreateFlagDTO) {
    const flags = await this.settingService.getFlags();
    const flag = flags.find(fl => fl.key === createFlagDTO.key);
    const { user, targetUser, key, value } = createFlagDTO;
    let type = 'boolean';
    let isRating = false;
    let data: any = { valid: false };
    const isValidValue = (value = null, type = '') => {
      switch (type) {
        case 'boolean':
        case 'bool':
          return value === true || value === false;
        case 'double':
        case 'bool':
          return typeof value === 'number' && isNaN(value) === false;
        default:
          return false;
      }
    };
    if (flag instanceof Object) {
      type = flag.type;
      isRating = flag.isRating === true;
      const isEmpty = value === null || value === undefined;
      const assignedValue = isEmpty ? flag.defaultValue : value;
      const isValid = isValidValue(assignedValue, type);
      if (isValid) {
        data = await this.feedbackService.saveFlag({
          user,
          targetUser,
          key,
          value: assignedValue,
          type,
          isRating,
        });
        if (data instanceof Object) {
          data.valid = true;
        }
      }
      data.fcm = this.sendNotification(createFlagDTO);
    }
    return res.json(data);
  }

  @Get('send-chat-request/:from/:to/:msg?')
  async sendChatRequest(
    @Res() res,
    @Param('from') from: string,
    @Param('to') to: string,
    @Param('msg') msg: string,
  ) {
    const key = 'chat_request';
    const data: any = { valid: false, fcm: null };
    if (isValidObjectId(from) && isValidObjectId(to)) {
      const infoFrom = await this.userService.getBasicById(from);
      if (
        infoFrom instanceof Object &&
        Object.keys(infoFrom).includes('nickName')
      ) {
        const title = infoFrom.nickName;
        const text = notEmptyString(msg, 2)
          ? fromBase64(msg)
          : 'New chat message';
        const createFlagDTO = {
          user: from,
          targetUser: to,
          key,
          type: 'title_text',
          value: {
            title,
            text,
          },
        } as CreateFlagDTO;
        data.fcm = await this.sendNotification(createFlagDTO);
        if (data.fcm instanceof Object && data.fcm.valid) {
          data.valid = true;
        }
      }
    }
    return res.json(data);
  }

  async sendNotification(
    createFlagDTO: CreateFlagDTO,
    customTitle = '',
    customBody = '',
    notificationKey = '',
    nickName = '',
    profileImg = '',
  ) {
    const { key, type, value, user, targetUser } = createFlagDTO;
    const targetDeviceToken = await this.userService.getUserDeviceToken(
      targetUser,
    );
    let fcm: any = { valid: false, reason: 'missing device token' };

    if (notEmptyString(targetDeviceToken, 5)) {
      const plainText = type === 'text' && notEmptyString(value);
      const titleText =
        type === 'title_text' &&
        value instanceof Object &&
        Object.keys(value).includes('title');
      const hasCustomTitle = notEmptyString(customTitle, 3);
      if (plainText || titleText || customTitle) {
        const hasCustomBody = notEmptyString(customBody, 3);
        const title = hasCustomTitle
          ? customTitle
          : plainText
          ? key.replace(/_/g, ' ')
          : value.title;
        const body = hasCustomBody
          ? customBody
          : plainText
          ? notEmptyString(value, 2)
            ? value
            : 'Someone has interacted with you.'
          : value.text;
        const payload: any = {
          key,
          type,
          value,
          user,
          targetUser,
        };
        if (notEmptyString(notificationKey)) {
          payload.notificationKey = notificationKey;
        }
        if (notEmptyString(nickName)) {
          payload.nickName = nickName;
        }
        if (notEmptyString(profileImg, 5)) {
          payload.profileImg = profileImg;
        }
        fcm = await pushMessage(targetDeviceToken, title, body, payload);
      }
    }
    return fcm;
  }

  @Get('test-fcm')
  async testFCM(@Res() res, @Query() query) {
    const params = objectToMap(query);
    const targetDeviceToken = params.has('targetDeviceToken')
      ? params.get('targetDeviceToken')
      : '';
    const title = params.has('title') ? params.get('title') : '';
    const body = params.has('body') ? params.get('body') : '';
    const fcm = await pushMessage(targetDeviceToken, title, body);
    return res.json(fcm);
  }

  // Rate another user (like = 1, superlike = 2, pass = -1, -2, -3)
  @Post('swipe')
  async saveSwipe(@Res() res, @Body() swipeDTO: SwipeDTO) {
    const { to, from, value, context } = swipeDTO;
    const minRatingValue = await this.settingService.minPassValue();
    const contextKey = notEmptyString(context)
      ? sanitize(context, '_')
      : 'swipe';
    const prevSwipe = await this.feedbackService.prevSwipe(from, to);
    const recipSwipe = await this.feedbackService.prevSwipe(to, from);
    let intValue = smartCastInt(value, 0);

    const {
      roles,
      likeStartTs,
      superlikeStartTs,
    } = await this.userService.memberRolesAndLikeStart(from);
    const nowTs = new Date().getTime();
    const currStartTs =
      intValue === 1 ? likeStartTs : intValue > 1 ? superlikeStartTs : 0;
    let numSwipes = await this.feedbackService.countRecentLikeability(
      from,
      intValue,
      currStartTs,
    );
    // fetch the max limit for this swipe action associated with a user's current roles
    let maxRating = await this.settingService.getMaxRatingLimit(
      roles,
      intValue,
    );
    // the like Start timestamp is in the future and the action is like
    // set the limit to zero
    if (currStartTs > nowTs && intValue > 0) {
      maxRating = -1;
    }
    const hasPaidRole = roles.some(rk => rk.includes('member'));
    const data: any = { valid: false, updated: false, value: intValue };
    const hasPrevPass = prevSwipe.valid && prevSwipe.value < 1;
    const isPass = intValue <= 0;
    // for free members set pass value to 0 if the other has liked them
    /* if (isPass && !hasPaidRole && recipSwipe.value > 0) {
      intValue = 0;
      isPass = false;
    } */
    const prevPass = isPass && hasPrevPass ? prevSwipe.value : 0;
    if (contextKey.includes('like') === false && intValue < 1 && isPass) {
      const isHardPass = intValue <= minRatingValue;
      if (isHardPass) {
        intValue = minRatingValue;
      } else if (hasPrevPass) {
        intValue = prevSwipe.value - 1;
      }
    }
    data.remaining = maxRating > 0 ? maxRating - numSwipes : 0;
    data.nextStartTs = currStartTs;
    data.secondsToWait =
      maxRating < 1 ? Math.ceil((currStartTs - nowTs - 50) / 1000) : 0;
    data.roles = roles;

    // skip maxRating check only if value is zero. If likes are used up, the value will be -1
    if (
      (numSwipes < maxRating || maxRating === 0) &&
      prevPass > minRatingValue
    ) {
      const flagData = {
        user: from,
        targetUser: to,
        key: 'likeability',
        type: 'int',
        isRating: true,
        value: intValue,
      } as CreateFlagDTO;
      const flag = await this.feedbackService.saveFlag(flagData);
      const valid = Object.keys(flag).includes('value');
      const sendMsg = intValue >= 1;
      let fcm = {};
      if (sendMsg) {
        const {
          lang,
          pushNotifications,
        } = await this.userService.getPreferredLangAndPnOptions(
          flagData.targetUser,
        );
        const pnKey =
          recipSwipe.value > 0
            ? 'been_matched'
            : intValue > 1
            ? 'been_superliked'
            : 'been_liked';
        const maySend = pushNotifications.includes(pnKey);
        if (maySend) {
          const {
            nickName,
            profileImg,
          } = await this.userService.getNickNameAndPic(flagData.user);

          const {
            title,
            body,
          } = await this.snippetService.buildRatingTitleBody(
            nickName,
            intValue,
            recipSwipe.value,
            lang,
          );
          fcm = await this.sendNotification(
            flagData,
            title,
            body,
            pnKey,
            nickName,
            profileImg,
          );
        }
      }
      data.valid = valid;
      data.flag = flag;
      data.fcm = fcm;
      data.prevSwipe = prevSwipe;
      if (valid && prevSwipe.value !== intValue) {
        numSwipes++;
        data.remaining--;
        data.updated = true;
      }
      data.count = numSwipes;
    }
    if (
      intValue > 0 &&
      !hasPaidRole &&
      data.remaining < 1 &&
      data.secondsToWait < 1
    ) {
      const hrsReset = await this.settingService.getFreeMemberLikeResetHours();
      const nextTs = await this.userService.updateLikeStartTs(
        from,
        hrsReset,
        intValue,
      );
      if (nextTs > 0) {
        data.nextStartTs = nextTs;
        data.secondsToWait = Math.ceil((nextTs - nowTs - 50) / 1000);
      }
    }
    return res.status(HttpStatus.OK).json({ ...data, recipSwipe, hasPaidRole });
  }

  /*
   * register viewed status of likeability match with interger value
   * 1) other user has liked you (acknowleged, not reciprocated yet)
   * 2) other user has superliked you (acknowleged, not reciprocated yet)
   * 3) other person has liked you to back (match acknowledged)
   * 4) other person has superliked to back (match acknowledged)
   * 5) other person has superliked you (and you have superliked them, reciprocal superlike acknowleged)
   * one-way like / superlike > OK
   * match acknowleged 3+
   */
  @Post('viewed')
  async saveRead(@Res() res, @Body() swipeDTO: SwipeDTO) {
    const value = smartCastInt(swipeDTO.value, 0);
    const result = { valid: false, status: 0 };
    let status = HttpStatus.NOT_ACCEPTABLE;
    if (
      isValidObjectId(swipeDTO.from) &&
      isValidObjectId(swipeDTO.to) &&
      value > 0
    ) {
      const createFlagDTO = {
        key: 'viewed',
        value,
        type: 'int',
        user: swipeDTO.from,
        targetUser: swipeDTO.to,
        createdAt: new Date(),
        modifiedAt: new Date(),
      } as CreateFlagDTO;
      const data = await this.feedbackService.saveFlag(createFlagDTO);
      if (data instanceof Object) {
        result.status = value;
        result.valid = true;
        status = HttpStatus.OK;
      }
    }
    return res.status(status).json(result);
  }

  @Get('friend/:mode/:fromId/:toId')
  async handleFriendRequest(
    @Res() res,
    @Param('mode') mode,
    @Param('fromId') fromId,
    @Param('toId') toId,
  ) {
    let result = -1;
    let fcm: any = null;
    const fromUser = await this.userService.getBasicById(fromId);
    const otherUser = await this.userService.getBasicById(toId);
    if (
      otherUser instanceof Object &&
      notEmptyString(otherUser.nickName) &&
      otherUser.active &&
      fromUser instanceof Object
    ) {
      switch (mode) {
        case 'request':
          result = await this.feedbackService.sendFriendRequest(fromId, toId);
          break;
        case 'accept':
          result = await this.feedbackService.acceptFriendRequest(fromId, toId);
          break;
      }
    }
    const valid = result > 0;
    if (valid) {
      const key = ['friend', mode].join('_');
      const requestMode = mode === 'request';
      const title = requestMode ? 'Friend request' : 'Friend request accepted';
      const body = requestMode
        ? `${fromUser.nickName} would like to connect with you.`
        : `${fromUser.nickName} has accepted your friend request`;
      const type = 'int';
      const value = requestMode ? 1 : 2;
      if (notEmptyString(otherUser.deviceToken)) {
        fcm = await pushMessage(otherUser.deviceToken, title, body, {
          key,
          type,
          value,
          user: fromId,
          targetUser: toId,
        });
      }
    }
    const status = valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json({ valid, result, mode, fromId, toId, fcm });
  }

  @Get('friends/:userId')
  async getFriendIds(@Res() res, @Param('userId') userId) {
    const validUser = isValidObjectId(userId);
    let valid = false;
    let friends: any[] = [];
    let sent: any[] = [];
    let received: any[] = [];
    const result = validUser
      ? await this.feedbackService.getFriends(userId)
      : null;
    if (result instanceof Object) {
      valid = result.friendIds instanceof Array;
      friends =
        valid && result.friendIds.length > 0
          ? await this.userService.getBasicByIds(result.friendIds, userId)
          : [];
      const validSent = result.sentIds instanceof Array;
      sent =
        validSent && result.sentIds.length > 0
          ? await this.userService.getBasicByIds(result.sentIds, userId)
          : [];
      const validReceived = result.receivedIds instanceof Array;
      received =
        validReceived && result.receivedIds.length > 0
          ? await this.userService.getBasicByIds(result.receivedIds, userId)
          : [];
    }
    const status = valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json({ valid, friends, received, sent });
  }

  @Delete('unfriend/:fromId/:toId')
  async removeFriend(@Res() res, @Param('fromId') fromId, @Param('toId') toId) {
    const result = await this.feedbackService.unfriend(fromId, toId);
    const valid = result > 0;
    const status = valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res
      .status(status)
      .json({ valid, result, mode: 'unfriend', fromId, toId });
  }

  @Delete('delete-flag/:key/:user/:user2/:mutual?')
  async deleteFlag(
    @Res() res,
    @Param('key') key,
    @Param('user') user,
    @Param('user2') user2,
    @Param('mutual') mutual,
  ) {
    const isMutual = smartCastInt(mutual, 0) > 0;
    const { result, result2 } = await this.feedbackService.deleteFlag(
      key,
      user,
      user2,
      isMutual,
    );
    const deleted = [];
    let delValue: any = null;
    let delValueRecip: any = null;
    if (result instanceof Object) {
      delValue = result.value;
      deleted.push('from');
    }
    if (result2 instanceof Object) {
      delValueRecip = result.value;
      deleted.push('to');
    }
    return res.json({
      user,
      user2,
      isMutual,
      key,
      deleted,
      delValue,
      delValueRecip,
    });
  }

  @Get('deactivate/:user?/?')
  async getUsersByCriteria(
    @Res() res,
    @Param('user') user,
    @Param('key') key,
    @Req() request: Request,
  ) {
    const { query } = request;
    const data = await this.feedbackService.getByTargetUserOrKey(
      user,
      key,
      query,
    );
    return res.json(data);
  }
}
