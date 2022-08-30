import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as Redis from 'ioredis';
import { Lexeme } from './interfaces/lexeme.interface';
import { CreateLexemeDTO } from './dto/create-lexeme.dto';
import { TranslationDTO } from './dto/translation.dto';
import { CategoryKeys } from './interfaces/category-keys';
import {
  extractFromRedisClient,
  extractFromRedisMap,
  hashMapToObject,
  storeInRedis,
} from '../lib/entities';
import { RedisService } from 'nestjs-redis';

@Injectable()
export class DictionaryService {
  constructor(
    @InjectModel('Lexeme')
    private lexemeModel: Model<Lexeme>,
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

  async redisSet(key: string, value): Promise<boolean> {
    const client = await this.redisClient();
    return await storeInRedis(client, key, value);
  }

  async getAll(criteria: any): Promise<Lexeme[]> {
    const filter = new Map<string, any>();
    if (criteria instanceof Object) {
      Object.entries(criteria).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'category':
            filter.set('key', new RegExp('^' + v + '__'));
            break;
          case 'categories':
            if (v instanceof Array) {
              filter.set('key', new RegExp('^(' + v.join('|') + ')__'));
            }
            break;
          case 'subcategory':
            filter.set('key', new RegExp('^' + v + '_'));
            break;
          case 'init':
            filter.set('key', new RegExp('^' + v));
            break;
        }
      });
    }
    const filteredCriteria = Object.fromEntries(filter);
    const lexemes = await this.lexemeModel.find(filteredCriteria).exec();
    return lexemes;
  }

  async getByKey(key: string): Promise<Lexeme> {
    return await this.lexemeModel.findOne({ key }).exec();
  }

  async getByCategory(key: string): Promise<Lexeme[]> {
    const rgx = new RegExp('^' + key + '__');
    return await this.lexemeModel.find({ key: rgx });
  }

  async getByCategories(keys: string[] = []): Promise<Lexeme[]> {
    const rgx = new RegExp('^(' + keys.join('|') + ')__');
    return await this.lexemeModel.find({ key: rgx });
  }

  async getCategoriesKeys(): Promise<Array<any>> {
    const keyRows = await this.lexemeModel
      .find({})
      .select(['key', '-_id'])
      .exec();
    let catKeys: Array<string> = [];
    if (keyRows.length > 0) {
      catKeys = keyRows.map(kr => kr.key);
    }
    return catKeys;
  }

  async getCategories(): Promise<Array<string>> {
    const keys = await this.getCategoriesKeys();
    let categories: Array<string> = [];
    if (keys.length > 0) {
      const catKeys = keys.map(k => k.split('__').shift());
      categories = catKeys.filter((key, ki) => catKeys.indexOf(key) === ki);
    }
    return categories;
  }

  async getCategoriesAndKeys(): Promise<Array<CategoryKeys>> {
    const keys = await this.getCategoriesKeys();
    let categoryKeys: Array<CategoryKeys> = [];
    if (keys.length > 0) {
      const catKeyPairs = keys.map(k => k.split('__'));
      const catKeys = catKeyPairs.map(pair => pair[0]);
      categoryKeys = catKeys
        .filter((ck, cki) => catKeys.indexOf(ck) === cki)
        .map(category => {
          const keys = catKeyPairs
            .filter(p => p[0] === category)
            .map(p => p[1]);
          return {
            category,
            keys,
          };
        });
    }
    return categoryKeys;
  }

  // post a single Lexeme
  async addLexeme(createLexemeDTO: CreateLexemeDTO): Promise<Lexeme> {
    const newLexeme = new this.lexemeModel(createLexemeDTO);
    return newLexeme.save();
  }
  // Edit Lexeme details
  async updateLexeme(
    key: string,
    createLexemeDTO: CreateLexemeDTO,
  ): Promise<Lexeme> {
    const item = { ...createLexemeDTO };
    item.modifiedAt = new Date();
    const updatedLexeme = await this.lexemeModel.findOneAndUpdate(
      { key },
      createLexemeDTO,
      { new: true },
    );
    return updatedLexeme;
  }

  async saveTranslationByKey(
    key: string,
    translationDTO: TranslationDTO,
  ): Promise<Lexeme> {
    const lexeme = await this.getByKey(key);
    if (lexeme) {
      const item = lexeme.toObject();
      if (item.translations) {
        const { lang, text } = translationDTO;
        let { type, alpha } = translationDTO;
        if (!type) {
          type = 'standard';
        }
        if (!alpha) {
          alpha = 'lt';
        }
        let ti = -1;
        if (item.translations.length > 0) {
          ti = item.translations.findIndex(
            tr => tr.lang === lang && (tr.type === type || type === 'variant'),
          );
        }
        if (ti < 0) {
          item.translations.push({ lang, text, type, alpha });
        } else {
          item.translations[ti] = { lang, text, type, alpha };
        }
        item.modifiedAt = new Date();
      }
      await this.updateLexeme(key, item);
      return await this.getByKey(key);
    }
  }

  async deleteLexemeByKey(key: string) {
    const lexeme = await this.getByKey(key);
    const mp = new Map<string, any>();
    if (lexeme) {
      this.lexemeModel.deleteOne({ key }).exec();
      mp.set('valid', true);
      mp.set('lexeme', lexeme);
      mp.set('message', 'Successfully deleted');
    } else {
      mp.set('valid', false);
      mp.set('message', 'Lexeme with this key not found');
    }
    return hashMapToObject(mp);
  }

  async getKutaDictMap(): Promise<Map<string, string>> {
    const mp: Map<string, string> = new Map();
    const lexemes = await this.getByCategories([
      'kuta',
      'rashi',
      'nakshatra',
      'dignity',
    ]);
    const matchKey = (longKey: string) => {
      const [start, end] = longKey.split('__');
      if (start === 'kuta') {
        return end.replace(/_/, '/');
      } else if (start === 'rashi') {
        return ['sign', end].join('/');
      } else {
        return [start, end].join('/');
      }
    };
    lexemes.forEach(lex => {
      const mKey = matchKey(lex.key);
      mp.set(mKey, lex.name);
    });
    return mp;
  }

  async getKutaDict(resetCache = false): Promise<Map<string, string>> {
    const key = 'kuta_dict';
    const stored = await this.redisGet(key);
    let mp: Map<string, string> = new Map();
    let hasStored = false;
    if (!resetCache && stored instanceof Object) {
      const entries = Object.entries(stored);
      if (entries.length > 10) {
        mp = new Map(entries) as Map<string, string>;
        hasStored = true;
      }
    }
    if (!hasStored) {
      const data = await this.getKutaDictMap();
      if (data instanceof Map && data.size > 10) {
        this.redisSet(key, Object.fromEntries(data.entries()));
        mp = data;
      }
    }
    return mp;
  }
}
