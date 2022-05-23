import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  NotFoundException,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingService } from './setting.service';
import { UserService } from '../user/user.service';
import { SnippetService } from '../snippet/snippet.service';
import { CreateSettingDTO } from './dto/create-setting.dto';
import { IdBoolDTO } from './dto/id-bool.dto';
import { ScoreDTO } from './dto/score.dto';
import { isNumeric, notEmptyString, validISODateString } from '../lib/validators';
import { extractDocId } from '../lib/entities';
import { exportCollection, listFiles } from '../lib/operations';
import {
  checkFileExists,
  buildFullPath,
  extractJsonData,
  writeSettingFile,
  uploadSwissEphDataFile,
  matchFullPath,
  writeSourceFile,
} from '../lib/files';
import * as moment from 'moment-timezone';
import availableLanguages from './sources/languages';
import defaultLanguageOptions from './sources/lang-options';
import { AdminGuard } from '../auth/admin.guard';
import { ProtocolDTO } from './dto/protocol.dto';
import { parseAstroBankCSV } from '../lib/parse-astro-csv';
import { deleteSwissEpheFile } from '../astrologic/lib/files';
import { ipWhitelistFileData } from '../auth/auth.utils';
import { StringsDTO } from './dto/strings.dto';
import { PredictiveRuleSetDTO } from './dto/predictive-rule-set.dto';
import { smartCastInt } from '../lib/converters';
import { DeviceVersion } from './lib/interfaces';
import { DeviceVersionDTO } from './dto/device-version.dto';

@Controller('setting')
export class SettingController {
  constructor(
    private settingService: SettingService,
    private userService: UserService,
    private snippetService: SnippetService,
  ) {}

  // add a setting
  @Post('create')
  async addSetting(@Res() res, @Body() createSettingDTO: CreateSettingDTO) {
    const setting = await this.settingService.addSetting(createSettingDTO);
    return res.status(HttpStatus.CREATED).json({
      message: 'Setting has been created successfully',
      setting,
    });
  }

  @Put('edit/:settingID')
  async editSetting(
    @Res() res,
    @Param('settingID') settingID,
    @Body() createSettingDTO: CreateSettingDTO,
  ) {
    const setting = await this.settingService.updateSetting(
      settingID,
      createSettingDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Setting has been updated successfully',
      setting,
    });
  }

  @Put('edit-by-key/:key/:userID')
  async editSettingByKey(
    @Res() res,
    @Param('key') key,
    @Param('userID') userID,
    @Body() createSettingDTO: CreateSettingDTO,
  ) {
    let setting: any = {};
    let message = 'Invalid key or user ID';
    if (this.userService.isAdminUser(userID)) {
      const result = await this.settingService.updateSettingByKey(key, createSettingDTO);
      if (notEmptyString(result.message)) {
        message = result.message;
        setting = result.setting;
      }
    }
    return res.status(HttpStatus.OK).json({
      message,
      setting,
    });
  }

  // Retrieve settings list
  @Get('person-chart-data')
  async getPersonChartData(@Res() res) {
    const data = await this.settingService.getSubjectDataSets();
    return res.status(HttpStatus.OK).json(data);
  }

  // Retrieve settings list
  @Get('list')
  async getAllSetting(@Res() res) {
    const settings = await this.settingService.getAllSetting();
    return res.status(HttpStatus.OK).json(settings);
  }

  @Get('device/version/:key')
  async getDeviceVersion(@Res() res, @Param('key') key) {
    const version = await this.settingService.deviceVersion(key);
    return res.status(HttpStatus.OK).json(version);
  }

  @Get('device/versions/:userID')
  async getDeviceVersions(@Res() res, @Param('userID') userID) {
    let versions: DeviceVersion[] = [];
    let status = HttpStatus.FORBIDDEN;
    const isAdminUser = await this.userService.isAdminUser(userID);
    if (isAdminUser) {
      versions = await this.settingService.deviceVersions();
      status = HttpStatus.OK;
    }
    return res.status(status).json(versions);
  }

  @Get('enforce-paid-logic')
  async enforcePaidLogic(@Res() res) {
    const enforce = await this.settingService.enforcePaidMembershipLogic();
    const valid = typeof enforce === 'boolean';
    const status = valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json({enforce, valid});
  }

  @Put('device/save-versions/:userID')
  async saveDeviceVersions(@Res() res, @Param('userID') userID, @Body() versions: DeviceVersionDTO[] ) {
    let result: any = { valid: false, items: [] };
    let status = HttpStatus.FORBIDDEN;
    const isAdminUser = await this.userService.isAdminUser(userID);
    if (isAdminUser) {
      versions = await this.settingService.saveDeviceVersions(versions);
      if (versions.length > 0) {
        result = {valid: true, items: versions };
        status = HttpStatus.OK;
      } else {
        status = HttpStatus.NOT_ACCEPTABLE;
      }
    }
    return res.status(status).json(result);
  }

  @Get('ip-whitelist/list/:userID')
  getIpWhitelist(@Res() res, @Param('userID') userID) {
    let ips = [];
    if (this.userService.isAdminUser(userID)) {
      ips = ipWhitelistFileData();
    }
    return res.status(HttpStatus.OK).json(ips);
  }

  @Put('ip-whitelist/save/:userID')
  saveIpWhitelist(
    @Res() res,
    @Param('userID') userID,
    @Body() ipData: StringsDTO,
  ) {
    const data = { valid: false, ips: [], result: null };
    if (
      this.userService.isAdminUser(userID) &&
      ipData.strings instanceof Array
    ) {
      const ipRgx = /^\d+\.\d+\.\d+\.\d+$/;
      const ips = ipData.strings
        .map(line => line.trim())
        .filter(line => ipRgx.test(line));
      data.result = writeSourceFile('ip-whitelist.txt', ips.join('\n'));
      data.ips = ips;
      data.valid = true;
    }
    return res.status(HttpStatus.OK).json(data);
  }

  // Retrieve settings list
  @Get('list-custom')
  async getCustomSetting(@Res() res) {
    const settings = await this.settingService.getCustom();
    return res.status(HttpStatus.OK).json(settings);
  }

  // Fetch a particular setting using ID
  @Get('item/:settingID')
  async getSetting(@Res() res, @Param('settingID') settingID) {
    const setting = await this.settingService.getSetting(settingID);
    if (!setting) {
      throw new NotFoundException('Setting does not exist!');
    }
    return res.status(HttpStatus.OK).json(setting);
  }

  // Fetch a particular setting using ID
  @Get('by-key/:key')
  async getByKey(@Res() res, @Param('key') key) {
    const setting = await this.settingService.getByKey(key);
    if (!setting) {
      throw new NotFoundException('Setting does not exist!');
    }
    return res.status(HttpStatus.OK).json(setting);
  }

  // Return the data from a particular setting identified by key
  // as downloadable JSON file
  @Get('json-file/:key')
  async jsonByKey(@Res() res, @Param('key') key) {
    const setting = await this.settingService.getByKey(key);
    let data: any = { valid: false };
    if (setting) {
      if (setting.value instanceof Object) {
        data = setting.value;
      }
    }
    res.attachment([key, '.json'].join(''));
    res.header('type', 'application/json');
    return res.send(JSON.stringify(data));
  }

  @Get('languages/:mode?')
  async languages(@Res() res, @Param('mode') mode) {
    const mapLangOpts = row => {
      return { ...row, enabled: true, native: '' };
    };
    const setting = await this.settingService.getByKey('languages');
    const showAll = mode === 'all';
    const bothMode = mode === 'both';
    const appMode = mode === 'app' || bothMode;
    const getDictOpts = mode !== 'app' || bothMode;
    const getAppOpts = mode !== 'dict';
    const hasSetting =
      setting instanceof Object && setting.value instanceof Array;
    const appLangs = getAppOpts
      ? hasSetting
        ? setting.value
        : defaultLanguageOptions.map(row => {
            return { ...row, enabled: true, native: '' };
          })
      : [];
    const dictSetting = await this.settingService.getByKey('dictlangs');
    const hasDictSetting =
      dictSetting instanceof Object && dictSetting.value instanceof Array;

    const dictLangs = getDictOpts
      ? hasDictSetting
        ? dictSetting.value
        : defaultLanguageOptions.map(mapLangOpts)
      : [];
    const values = showAll
      ? availableLanguages.map(lang => {
          const { name, code2l } = lang;
          const saved = appLangs.find(lang => lang.key === code2l);
          const dictOpt = dictLangs.find(lang => lang.key === code2l);
          const inApp = saved instanceof Object;
          const inDict = dictOpt instanceof Object;
          const native =
            inApp && notEmptyString(saved.native, 2)
              ? saved.native
              : inDict && notEmptyString(dictOpt.native, 2)
              ? dictOpt.native
              : lang.native;
          return {
            key: code2l,
            name,
            native,
            appWeight: inApp ? saved.weight : 9999,
            dictWeight: inDict ? dictOpt.weight : 9999,
            inApp,
            inDict,
          };
        })
      : appMode
      ? appLangs
      : dictLangs;
    if (bothMode) {
      dictLangs.forEach(row => {
        if (values.some(lang => lang.key === row.key) === false) {
          values.push(row);
        }
      });
    }
    const data = {
      valid: values.length > 0,
      languages: values,
    };

    return res.status(HttpStatus.OK).json(data);
  }

  @Get('flags/:refresh')
  async getAllFlags(@Res() res, @Param('refresh') refresh = '') {
    const skipCache = refresh === 'refresh';
    const flags = await this.settingService.getFlags(skipCache);
    return res.json(flags);
  }

  @Get('last-modified/:key/:lang?')
  async getLastModified(@Res() res, @Param('key') key, @Param('lang') lang = 'en') {
    const setting = await this.settingService.getByKey(key);
    const exists = setting instanceof Object && Object.keys(setting).includes('value') && setting.value !== null;
    const mod = exists ? setting.modifiedAt : null;
    
    const ts = new Date().getTime() / 1000;
    const modTs = mod instanceof Date ? mod.getTime() / 1000 : 0;
    const snippetData = exists? await this.snippetService.lastModified(lang, key) : null;
    const hasSnippets = snippetData instanceof Object && validISODateString(snippetData.modifiedAt);
    const translationModifiedAt = hasSnippets? snippetData.modifiedAt : '';
    const translationSecondsAgo = hasSnippets ? snippetData.hasLocale? snippetData.locale : snippetData.general : 0;
    const secondsAgo = exists? Math.floor(ts - modTs) : 0;
    const modifiedAt = exists? mod.toISOString().split('.').shift() : '';
    const status = exists? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json({
      exists,
      modifiedAt,
      secondsAgo,
      hasTranslations: hasSnippets,
      translationModifiedAt,
      translationSecondsAgo,
    });
  }

  // List all cache keys matching the specified pattern. Admin user ID required
  @Get('redis-keys/:userID/:pattern')
  async listCackeysByPattern(@Res() res, @Param('userID') userID, @Param('pattern') pattern) {
    const result = { valid: false, keys: [], num: 0 };
    const isAdmin = await this.userService.isAdminUser(userID);
    if (isAdmin) {
      if (notEmptyString(pattern, 2)) {
        const keys = await this.settingService.getRedisKeys(pattern, 1000);
        if (keys.length > 0) {
          result.num = keys.length;
          result.keys = keys;
          result.valid = true;
        }
      }
    }
    return res.status(HttpStatus.OK).json(result);
  }

  // List all empty cache keys. Admin user ID required
  @Get('redis-keys-empty/:userID/:remove?')
  async listEmptyCacheKeys(@Res() res, @Param('userID') userID, @Param('remove') remove) {
    const result = { valid: false, keys: [], num: 0 };
    const isAdmin = await this.userService.isAdminUser(userID);
    if (isAdmin) {
      const removeAll = smartCastInt(remove, 0) > 0;
      const keys = await this.settingService.getEmptyRedisKeys(removeAll);
      if (keys.length > 0) {
        result.num = keys.length;
        result.keys = keys;
        result.valid = true;
      }
    }
    return res.status(HttpStatus.OK).json(result);
  }

  // Flush all caches
  @Get('redis-info/:key')
  async getRedisInfo(@Res() res, @Param('key') key) {
    const result = { valid: false, data: null, size: 0 };
    const cleanedKey = key.replace(/--/g,'/')
    const data = await this.settingService.redisGet(cleanedKey);
    let status = HttpStatus.NOT_FOUND;
    if (data !== null) {
      result.data = data;
      result.valid = true;
      result.size = JSON.stringify(data).length;
      status = HttpStatus.OK;
    }
    return res.status(status).json(result);
  }

  // clear redis cached item by key pattern
  @Delete('clear-by-key/:userID/:key')
  async clearByKey(@Res() res, @Param('userID') userID, @Param('key') key) {
    const result = { valid: false };
    const isAdmin = await this.userService.isAdminUser(userID);
    if (isAdmin && notEmptyString(key, 2)) {
      this.settingService.clearCacheByKey(key);
      result.valid = true;
    }
    return res.status(HttpStatus.OK).json(result);
  }

  // Return the data from a particular setting identified by key
  // as downloadable JSON file
  @Get('get-file/:directory/:name')
  async fileByName(
    @Res() res,
    @Param('directory') directory,
    @Param('name') name,
  ) {
    let fullPath = '';
    res.attachment([directory, name].join('-'));
    res.header('type', 'application/json');
    if (checkFileExists(name, directory)) {
      fullPath = buildFullPath(name, directory);
    }
    return res.sendFile(fullPath);
  }

  @Get('protocols/list/:userID')
  async getRulesCollections(@Res() res, @Param('userID') userID) {
    const isAdmin = await this.userService.isAdminUser(userID);
    const hasUserID = notEmptyString(userID, 16) && /^[0-9a-f]+$/i.test(userID);
    const userRef = isAdmin ? '' : hasUserID ? userID : '-';
    const rules = await this.settingService.getProtcols(userRef);
    const statusCode = hasUserID
      ? rules.length > 0
        ? HttpStatus.OK
        : HttpStatus.NO_CONTENT
      : HttpStatus.NOT_ACCEPTABLE;
    return res.status(statusCode).send(rules);
  }

  /*
  Save new protocol with nested rules-collections
  */
  @Post('protocol/save')
  async saveRulesCollections(@Res() res, @Body() protocolDTO: ProtocolDTO) {
    const data = await this.settingService.saveProtcol(protocolDTO);
    return res.status(HttpStatus.CREATED).send(data);
  }

  @Put('protocol/edit/:itemID')
  async updateRulesCollections(
    @Res() res,
    @Param('itemID') itemID,
    @Body() protocolDTO: ProtocolDTO,
  ) {
    const { user } = protocolDTO;
    const item = await this.settingService.getProtocol(itemID);
    let result: any = { valid: false };
    if (item instanceof Object) {
      const isAdmin = await this.userService.isAdminUser(user);
      if (isAdmin || item.user.toString() === user.toString()) {
        await this.settingService.saveProtcol(protocolDTO, itemID);
        result = { valid: true, item };
      }
    }
    return res.send(result);
  }

  @Get('protocol/single/:itemID')
  async getRulesCollection(@Res() res, @Param('itemID') itemID) {
    const item = await this.settingService.getProtocol(itemID);
    const result: any = { valid: false, item: null, itemID };
    if (item instanceof Object) {
      result.item = item;
    }
    return res.send(result);
  }

  @Get('kota-chakra')
  async getKotaCakra(@Res() res) {
    const result = await this.settingService.getKotaChakraScoreData();
    const isObj = result instanceof Object;
    const valid = isObj && Object.keys(result).includes('scores') && result.scores instanceof Array;
    const obj = isObj ? result : {};
    return res.send({...obj, valid});
  }

  @Get('sbc-criteria/:skip?')
  async getSBCCriteria(@Res() res, @Param('skip') skip) {
    const skipCache = smartCastInt(skip, 0) > 0;
    const offset = await this.settingService.sbcOffset(skipCache);
    const result = { valid: offset !== 0, offset };
    return res.send(result);
  }

  @Post('predictive/save')
  async savePredictiveRule(
    @Res() res,
    @Body() ruleSetDTO: PredictiveRuleSetDTO,
  ) {
    const data = await this.settingService.savePredictiveRuleSet(ruleSetDTO);
    return res.status(HttpStatus.CREATED).send(data);
  }

  @Put('predictive/edit/:ruleID')
  async editPredictiveRule(
    @Res() res,
    @Param('ruleID') ruleID,
    @Body() ruleSetDTO: PredictiveRuleSetDTO,
  ) {
    const data = await this.settingService.savePredictiveRuleSet(
      ruleSetDTO,
      ruleID,
    );
    return res.status(HttpStatus.OK).send(data);
  }

  @Get('predictive/list/:userID?')
  async listPredictiveRules(@Res() res, @Param('userID') userID) {
    const data = await this.settingService.getRuleSets(userID);
    return res.status(HttpStatus.OK).send(data);
  }

  @Get('pp-cutoff?')
  async getPPCutoff(@Res() res) {
    const data = await this.settingService.getByKey('pp_cutoff');
    const result = { valid: false, value: 0 };
    if (data instanceof Object && isNumeric(data.value)) {
      result.value = smartCastInt(data.value);
      result.valid = result.value > 0;
    }
    return res.status(HttpStatus.OK).send(result);
  }

  @Post('save-pp-cutoff?')
  async savePPCutoff(@Res() res, @Body() payload: ScoreDTO ) {
    const key = 'pp_cutoff';
    let message = '';
    let setting = null;
    let valid = false;
    if (payload.key === key) {
      const { value } = payload;
      const settingDTO = { 
        key,
        value,
        type: 'integer'
      } as CreateSettingDTO;
      const result = await this.settingService.updateSettingByKey(key, settingDTO, true);
      if (notEmptyString(result.message)) {
        message = result.message;
        setting = result.setting;
        valid = true;
      }
    }
    return res.status(HttpStatus.OK).send({ setting, message, valid });
  }

  @Delete('predictive/delete/:userID/:itemID')
  async deletePredictiveRule(
    @Res() res,
    @Param('userID') userID,
    @Param('itemID') itemID,
  ) {
    const isAdmin = await this.userService.isAdminUser(userID);
    const data = await this.settingService.deletePredictiveRuleSet(
      itemID,
      userID,
      isAdmin,
    );
    return res.status(HttpStatus.CREATED).send(data);
  }



  @Post('predictive-rules-status')
  async savePredictiveRuleStatus(@Res() res, @Body() items: IdBoolDTO[]) {
    const result: Map<string, any> = new Map([['valid', false]]);

    if (items.length > 0) {
      const ids = await this.settingService.savePredictiveRulesActive(items, true);
      result.set('ids', ids);
      result.set('valid', ids.length > 0);
    }
    return res.json(Object.fromEntries(result))
  }

  // Fetch a particular setting using ID
  @Delete('delete/:settingID/:userID')
  async delete(
    @Res() res,
    @Param('settingID') settingID,
    @Param('userID') userID,
  ) {
    const data = { valid: false, setting: '' };
    let statusCode = HttpStatus.NOT_ACCEPTABLE;
    if (this.userService.isAdminUser(userID)) {
      data.setting = await this.settingService.delete(settingID);
      data.valid = data.setting.toString().length > 6;
      if (data.valid) {
        statusCode = HttpStatus.OK;
      }
    }
    return res.status(statusCode).json(data);
  }

  @Get('reset-custom-cache/:userID')
  async resetCustomCache(@Res() res, @Param('userID') userID) {
    const isAdmin = await this.userService.isAdminUser(userID);
    let valid = false;
    if (isAdmin) { 
      valid = await this.settingService.resetCustomSettingsCache();
    }
    return res.json({valid});
  }

  // Fetch a particular setting using ID
  @Delete('protocol/delete/:itemID/:userID')
  async deleteRulesCollection(
    @Res() res,
    @Param('itemID') itemID,
    @Param('userID') userID,
  ) {
    const data = { valid: false, item: null };
    const item = await this.settingService.getProtocol(itemID);
    if (
      this.userService.isAdminUser(userID) ||
      item.user.toString() === userID
    ) {
      data.item = await this.settingService.deleteProtocol(itemID);
      data.valid = true;
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @UseGuards(AdminGuard)
  @Get('list-dir/:directory')
  async listDirectory(@Res() res, @Param('directory') directory) {
    const data = await listFiles(directory);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('backup/:userID/:key')
  async backup(@Res() res, @Param('userID') userID, @Param('key') key) {
    const data = { valid: false, outfile: '' };
    //const filePath = [backupPath, '/', key, '.json'].join('');
    const isAdmin = await this.userService.isAdminUser(userID);
    if (isAdmin) {
      data.outfile = exportCollection(key);
      data.valid = notEmptyString(data.outfile);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('file-download/:userID/:fileName/:dir?')
  async downloadResource(
    @Res() res,
    @Param('userID') userID,
    @Param('fileName') fileName: string,
    @Param('dir') dir,
  ) {
    const isAdmin = await this.userService.isAdminUser(userID);
    if (isAdmin && notEmptyString(fileName)) {
      const dirRef = notEmptyString(dir) ? dir : 'backups';
      const fileRef = matchFullPath(fileName, dirRef);
      if (fileRef.valid) {
        res.header('Content-Transfer-Encoding', 'binary');
        res.header('Expires', '0');
        res.header(
          'Cache-Control',
          'must-revalidate, post-check=0, pre-check=0',
        );
        res.header('Pragma', 'public');
        res.header('Content-Length', fileRef.size);
        return res.download(fileRef.path);
      } else {
        return res.status(HttpStatus.NOT_FOUND).json({ valid: false });
      }
    } else {
      return res.status(HttpStatus.NOT_ACCEPTABLE).json({ valid: false });
    }
  }

  @Post('import-custom/:key')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCustom(@Res() res, @Param('key') key, @UploadedFile() file) {
    const jsonData = extractJsonData(file, key, 'replace');
    let statusCode = HttpStatus.NOT_ACCEPTABLE;
    if (jsonData.get('valid')) {
      const setting = await this.settingService.getByKey(key);
      if (setting) {
        if (setting.value instanceof Object) {
          const customValue = setting.value;
          const dateSuffix = moment().format('YYYY-MM-DD-HH-mm-ss');
          const fileName = [
            'custom-setting-',
            key,
            '-',
            dateSuffix,
            '.json',
          ].join('');
          writeSettingFile(fileName, customValue);
          jsonData.set('restore', fileName);
          statusCode = HttpStatus.OK;
        }
      }
    }
    return res.status(statusCode).json(Object.fromEntries(jsonData));
  }

  @Post('upload-swiss-ephemeris/:userID/:newName?/:subDir?/:mode?')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSwissEphFile(
    @Res() res,
    @Param('userID') userID,
    @Param('newName') newName,
    @Param('subDir') subDir,
    @Param('mode') mode,
    @UploadedFile() file,
  ) {
    const result: Map<string, any> = new Map();
    let msg = '';
    let statusCode = HttpStatus.ACCEPTED;
    if (this.userService.isAdminUser(userID)) {
      const { originalname, mimetype, size, buffer } = file;
      const targetName = notEmptyString(newName, 5) ? newName : originalname;
      const subDirKey =
        notEmptyString(subDir) && /\w+/.test(subDir) ? subDir : '';
      const modeKey = notEmptyString(mode) ? mode : 'add';
      const data = uploadSwissEphDataFile(
        targetName,
        subDirKey,
        buffer,
        modeKey,
      );

      Object.entries(data).forEach(entry => {
        const [key, val] = entry;
        result.set(key, val);
      });
      const newSize = result.has('newSize') ? result.get('newSize') : 0;
      result.set('dataSize', size);
      result.set('mimetype', mimetype);
      const validSize = newSize > 0;
      result.set('valid', validSize);
      const exists = result.get('exists') === true;
      const replaced = result.get('replaced') === true;
      if (validSize) {
        msg = replaced ? 'File uploaded and replaced' : 'New file uploaded';
      } else if (exists === true && !replaced) {
        msg = 'Could not be replaced';
      }
    } else {
      result.set('valid', false);
      msg = 'Not authorised';
      statusCode = HttpStatus.FORBIDDEN;
    }
    result.set('message', msg);
    return res.status(statusCode).json(Object.fromEntries(result));
  }

  @Delete('delete-swisseph-file/:userID/:fn/:subDir?')
  async deleteSwephFile(
    @Res() res,
    @Param('userID') userID,
    @Param('fn') fn,
    @Param('subDir') subDir,
  ) {
    const result = { valid: false, deleted: false, file: fn, subDir };
    if (this.userService.isAdminUser(userID)) {
      result.deleted = deleteSwissEpheFile(fn, subDir);
      result.valid = true;
    }
    return res.json(result);
  }

  @Post('import/:mode/:key')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCollection(
    @Res() res,
    @Param('mode') mode,
    @Param('key') key,
    @UploadedFile() file,
  ) {
    const jsonData = extractJsonData(file, key, mode);
    let statusCode = HttpStatus.NOT_ACCEPTABLE;
    if (jsonData.get('isArrayOfObjects')) {
      let module = '';
      let schemaName = '';
      switch (key) {
        case 'users':
        case 'user':
          module = 'user';
          schemaName = 'user';
          break;
      }
      const schemaPath = '../' + module + '/schemas/' + schemaName + '.schema';
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const schemas = require(schemaPath);

      if (schemas.constructor instanceof Function) {
        Object.entries(schemas).forEach(entry => {
          const name = entry[0];
          const item: any = entry[1];
          if (name.endsWith('Schema')) {
            if (item instanceof Object) {
              const objKeys = Object.keys(item);
              if (objKeys.includes('obj')) {
                if (item.obj instanceof Object) {
                  const validKeys = Object.keys(item.obj);
                  jsonData.set('validKeys', validKeys);
                  statusCode = HttpStatus.OK;
                }
              }
            }
          }
        });
      }
    }
    return res.status(statusCode).json(Object.fromEntries(jsonData));
  }

  @Get('test-records/import')
  async importTestRecords(@Res() res) {
    const result = await parseAstroBankCSV();
    return res.send(result);
  }
}
