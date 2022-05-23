import { HttpService, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Snippet } from './interfaces/snippet.interface';
import { TranslatedItem } from './interfaces/translated-item.interface';
import { CreateSnippetDTO } from './dto/create-snippet.dto';
import { BulkSnippetDTO } from './dto/bulk-snippet.dto';
import { extractDocId, hashMapToObject, extractObject } from '../lib/entities';
import { v2 } from '@google-cloud/translate';
import { googleTranslate } from '../.config';
import { notEmptyString } from '../lib/validators';
import { capitalize } from '../astrologic/lib/helpers';
import { extractSnippetTextByLang } from '../lib/converters';
const { Translate } = v2;

@Injectable()
export class SnippetService {
  constructor(
    @InjectModel('Snippet') private readonly snippetModel: Model<Snippet>,
    @InjectModel('TranslatedItem')
    private readonly translationModel: Model<TranslatedItem>,
    private http: HttpService,
  ) {}
  // fetch all Snippets
  async list(publishedOnly = true, modFields = false, category = ''): Promise<Snippet[]> {
    const filterMap: Map<string, any> = new Map();
    if (publishedOnly) {
      filterMap.set('values', { $exists: true, $ne: [] });
      filterMap.set('published', true );
    }
    if (notEmptyString(category, 2)) {
      const catRgx = new RegExp('^' + category.replace(/_+$/, '') + '__');
      filterMap.set('key', catRgx );
    }
    const filter = Object.fromEntries(filterMap.entries());
    const fields =
      publishedOnly && !modFields
        ? {
            _id: 0,
            key: 1,
            format: 1,
            values: 1,
          }
        : {};
    return await this.snippetModel
      .find(filter)
      .select(fields)
      .exec();
  }

  async categories(): Promise<string[]> {
    const rows = await this.snippetModel
      .find()
      .select({ _id: 0, key: 1 })
      .exec();
    const categories: Array<string> = [];
    rows.forEach(row => {
      const { key } = row;
      if (key) {
        const category = key.split('__').shift();
        if (categories.indexOf(category) < 0) {
          categories.push(category);
        }
      }
    });
    return categories;
  }

  async allByCategory(category = ''): Promise<Snippet[]> {
    let items = [];
    if (notEmptyString(category, 2)) {
      const rgx = new RegExp('^' + category + '__');
      items = await this.snippetModel.find({ key: rgx });
    }
    return items;
  }

  async bulkDelete(category = ''): Promise<any> {
    let result: any = { deleted: 0 };
    if (notEmptyString(category, 2)) {
      const rgx = new RegExp('^' + category + '__');
      result = await this.snippetModel.deleteMany({ key: rgx }).exec();
    }
    return result;
  }

  // fetch all snippets with core fields only
  async getAll(): Promise<Snippet[]> {
    const Snippets = await this.snippetModel.find().exec();
    return Snippets;
  }
  // Get a single Snippet
  async getSnippet(snippetID): Promise<Snippet> {
    const snippet = await this.snippetModel.findById(snippetID).exec();
    return snippet;
  }

  // Get a single Snippet
  async getSnippetByKey(key: string): Promise<Snippet> {
    const snippet = await this.snippetModel.findOne({ key }).exec();
    return snippet;
  }

  async getSnippetByKeyStart(key: string): Promise<any> {
    const fields = {
      key: 1,
      values: 1,
      _id: 0,
    };
    const snippet = await this.snippetModel
      .findOne({ key })
      .select(fields)
      .exec();
    const data = { snippet, options: [] };
    const rgx = new RegExp('^' + key + '_option_');
    const related = await this.snippetModel
      .find({ key: rgx })
      .select(fields)
      .exec();
    if (related.length > 0) {
      data.options = related;
    }
    return data;
  }

  // Bulk-edit submission status fields
  async bulkUpdate(bulkSnippetDTO: BulkSnippetDTO): Promise<BulkSnippetDTO> {
    const { items } = bulkSnippetDTO;
    if (items.length > 0) {
      for (const item of items) {
        const { key, values } = item;
        const sn = await this.getByKey(key);
        const snId = sn instanceof Object ? extractDocId(sn) : '';
        if (values.length > 2) {
          if (snId.length > 3) {
            await this.snippetModel.findByIdAndUpdate(
              extractDocId(sn),
              {
                values,
              },
              { new: false },
            );
          } else {
            const newSnippet = new this.snippetModel({
              key,
              values,
              format: 'text',
            });
            newSnippet.save();
          }
        }
      }
    }
    return bulkSnippetDTO;
  }

  // Get a single Snippet by key
  async getByKey(snippetKey): Promise<Snippet> {
    return await this.snippetModel.findOne({ key: snippetKey }).exec();
  }

  async getByCategory(prefix = ''): Promise<Snippet[]> {
    const rgx = new RegExp('^' + prefix.replace(/__$/, '') + '__');
    return await this.snippetModel.find({ key: rgx });
  }

  async getByKeys(
    keys: string[] = [],
    prefix = '',
    prefixIsCategory = false,
  ): Promise<Snippet[]> {
    const hasPrefix = notEmptyString(prefix, 2);
    const fullPrefix = hasPrefix
      ? prefixIsCategory
        ? prefix + '_'
        : prefix
      : '';
    const fullKeys = hasPrefix
      ? keys.map(k => [fullPrefix, k].join('_'))
      : keys;
    return await this.snippetModel.find({ key: { $in: fullKeys } });
  }

  async getByKeyInCategory(keys: string[] = [], category = '') {
    return await this.getByKeys(keys, category, true);
  }

  // post a single Snippet
  async save(
    createSnippetDTO: CreateSnippetDTO,
    overrideKey = '',
  ): Promise<Snippet> {
    const { key, published, notes, format, values } = createSnippetDTO;
    const snippet = await this.snippetModel.findOne({ key });
    const exists = snippet instanceof Object;
    const dt = new Date();
    let filteredValues = [];
    const snippetObj = extractObject(snippet);
    if (values instanceof Array) {
      filteredValues = values.map(vl => {
        let isEdited = false;
        let isNew = true;
        let createdAt = null;
        if (exists) {
          const versionRow = snippetObj.values.find(v2 => v2.lang === vl.lang);
          if (versionRow) {
            isNew = false;
            isEdited =
              versionRow.text !== vl.text ||
              versionRow.active !== vl.active ||
              versionRow.approved !== vl.approved;
            createdAt = versionRow.createdAt;
            if (!isNew && !isEdited) {
              vl = versionRow;
            }
          }
        }
        if (isNew) {
          return { ...vl, modifiedAt: dt, createdAt: dt };
        } else if (isEdited) {
          return { ...vl, createdAt, modifiedAt: dt };
        } else {
          return vl;
        }
      });
    }
    const payload = {
      key,
      format,
      notes,
      published,
      values: filteredValues,
      modifiedAt: dt,
    };
    if (exists) {
      return await this.snippetModel.findByIdAndUpdate(
        extractDocId(snippet),
        payload,
        { new: true },
      );
    } else {
      const newSnippet = new this.snippetModel({
        ...payload,
        createdAt: dt,
      });
      if (notEmptyString(overrideKey, 5) && overrideKey !== payload.key) {
        this.snippetModel.deleteOne({ key: overrideKey }).exec();
      }
      return await newSnippet.save();
    }
  }

  async getSnippetText(key = '', lang = '') {
    let text = '';
    const storedSnippet = await this.getByKey(key);
    if (storedSnippet instanceof Model) {
      text = extractSnippetTextByLang(storedSnippet, lang);
    }
    return text;
  }

  async buildRatingTitleBody(
    nickName,
    value: number,
    recipValue = 0,
    lang = 'en',
  ): Promise<{ title: string; body: string }> {
    const isMatch = recipValue > 0;
    const type =
      value === 2 && (!isMatch || recipValue === 2) ? 'superlike' : 'like';
    const subKey = isMatch ? 'match_notification' : 'notification';
    const snKey = ['feedback', [type, subKey].join('_')].join('__');
    const snTitleKey = [
      'feedback',
      [type, 'notification_title'].join('_'),
    ].join('__');
    let body = await this.getSnippetText(snKey, lang);

    let title = await this.getSnippetText(snTitleKey, lang);
    if (title.length < 3) {
      const actionName = isMatch ? 'Match' : capitalize(type);
      title = 'FindingYou ' + actionName;
    }

    if (body.length < 3) {
      const action = `${type}d`;
      body = `${nickName} has ${action} you`;
    } else {
      body = body
        .replace('%nick_name', nickName)
        .replace('%user_name', nickName);
    }
    return { title, body };
  }

  async lastModified(lang = 'en', category = '') {
    const snippets = await this.list(true, true, category);
    const mods: number[] = [];
    const langMods: Map<string, number[]> = new Map();
    snippets.forEach(snippet => {
      mods.push(new Date(snippet.modifiedAt).getTime());
      snippet.values.forEach(vl => {
        const langModItems = langMods.has(vl.lang) ? langMods.get(vl.lang) : [];
        langModItems.push(new Date(vl.modifiedAt).getTime());
        langMods.set(vl.lang, langModItems);
      });
    });
    const enMods = langMods.has('en') ? langMods.get('en') : [];
    if (langMods.has('en-GB')) {
      const extraMods = langMods.get('en-GB');
      extraMods.forEach(md => {
        enMods.push(md);
      });
    }
    let localeMods = [];
    if (lang !== 'en' && lang !== 'en-GB') {
      if (langMods.has(lang)) {
        localeMods = langMods.get(lang);
      }
    }
    const ts = new Date().getTime();
    const exists = mods.length > 0;
    const maxGeneral = exists ? Math.max(...mods) : 0;
    const maxEn = mods.length > 0 ? Math.max(...enMods) : 0;
    const hasLocale = localeMods.length > 0;
    const maxLocale = hasLocale ? Math.max(...localeMods) : 0;
    const secsAgo = (modTs: number) => Math.ceil((ts - modTs) / 1000);
    const maxContext = hasLocale ? maxLocale : maxGeneral;
    const modifiedAt =  maxGeneral > 1000 ? new Date(maxContext).toISOString().split('.').shift() : '';
    return {
      exists,
      general: exists ? secsAgo(maxGeneral) : 0,
      modifiedAt,
      en: exists ? secsAgo(maxEn) : 0,
      locale: hasLocale? secsAgo(maxLocale) : 0,
      hasLocale,
      lang,
    };
  }

  async deleteByKey(key: string, unpublish = false) {
    const lexeme = await this.getByKey(key);
    const mp = new Map<string, any>();
    if (lexeme) {
      const mayDelete = lexeme.published === false || unpublish === true;
      if (mayDelete) {
        this.snippetModel.deleteOne({ key }).exec();
        mp.set('valid', true);
        mp.set('lexeme', lexeme);
        mp.set('message', 'Successfully deleted');
      } else {
        mp.set('valid', false);
        mp.set('lexeme', lexeme);
        mp.set('message', 'This item may still be used somewhere');
      }
    } else {
      mp.set('valid', false);
      mp.set('message', 'Lexeme with this key not found');
    }
    return hashMapToObject(mp);
  }

  async matchTranslation(text: string, to = '', from = 'en') {
    const rgx = new RegExp('^' + text.trim().replace(/\s+/, ' ') + '$', 'i');
    const item = await this.translationModel.findOne({
      from,
      to,
      source: rgx,
    });
    return item instanceof Object
      ? item.toObject()
      : { to, from, source: '', text: '' };
  }

  async saveTranslation(text: string, source: string, to = '', from = 'en') {
    const inData = {
      text,
      source,
      to,
      from,
      createdAt: new Date(),
    };
    const translationModel = new this.translationModel(inData);
    return translationModel.save();
  }

  async fetchGoogleTranslation(text = '', target = '', source = 'en') {
    const { key, projectId } = googleTranslate;
    const translate = new Translate({ projectId, key });
    const [translation] = await translate.translate(text, {
      to: target,
      from: source,
    });
    return { text, translation };
  }

  async translateItem(text = '', target = '', source = 'en') {
    const mayMatchExisting = text.length < 128 && !/\n/.test(text);
    const item = mayMatchExisting
      ? await this.matchTranslation(text, target, source)
      : null;
    if (item instanceof Object && notEmptyString(item.text)) {
      return {
        text,
        translation: item.text,
        isNew: false,
      };
    } else {
      const newItem = await this.fetchGoogleTranslation(text, target, source);
      if (notEmptyString(newItem.translation)) {
        this.saveTranslation(newItem.translation, text, target, source);
      }
      return { ...newItem, isNew: true };
    }
  }
}
