import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Query,
  NotFoundException,
  Delete,
  Param,
} from '@nestjs/common';
import { SnippetService } from './snippet.service';
import { UserService } from '../user/user.service';
import { CreateSnippetDTO } from './dto/create-snippet.dto';
import { BulkSnippetDTO } from './dto/bulk-snippet.dto';
import {
  smartCastBool,
  smartCastInt,
  smartCastString,
} from '../lib/converters';
import { notEmptyString } from '../lib/validators';
import googleTranslateCodes from './sources/google-translate-codes';
import { TranslateDTO } from './dto/translate.dto';
import { exportCollection } from '../lib/operations';

/*
Provide alternative versions of snippets if not available
The English version will always be available but for some languages
an alternative closer match may be provided, e.g. Ukrainians may understand Russian
This is separate from the preferred locale variants. These alternative then become available 
without having to re-download a new set of snippets or provide all users with all languages (which would be manageable for small number)
*/
const defaultLangCodes = (baseLang = '') => {
  const codes = ['en'];
  switch (baseLang) {
    case 'uk':
      codes.push('ru');
      break;
  }
  return codes;
};

@Controller('snippet')
export class SnippetController {
  constructor(
    private snippetService: SnippetService,
    private userService: UserService,
  ) {}

  // add a snippet
  @Post('bulk-save')
  async bulkSave(@Res() res, @Body() bulkSnippetDTO: BulkSnippetDTO) {
    const result = await this.snippetService.bulkUpdate(bulkSnippetDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Snippets saved successfully',
      result,
    });
  }

  @Post('save')
  async save(
    @Res() res,
    @Body() createSnippetDTO: CreateSnippetDTO,
    @Query() query,
  ) {
    const keys = query instanceof Object ? Object.keys(query) : [];
    const translateLangStr = keys.includes('langs') ? query.langs : '';
    const fromLang = keys.includes('from') ? query.from : 'en';
    const overrideKey = keys.includes('override') ? query.override : '';
    const translateLangs = notEmptyString(translateLangStr)
      ? translateLangStr.split(',')
      : [];
    const { values } = createSnippetDTO;
    if (values instanceof Array && translateLangs.length > 0) {
      const defaultLang = createSnippetDTO.values.find(
        vn => vn.lang === fromLang || vn.lang.startsWith(`${fromLang}-`),
      );
      const nowDt = new Date();
      if (defaultLang) {
        for (const toKey of translateLangs) {
          if (toKey !== fromLang) {
            const versionIndex = values.findIndex(
              vn => vn.lang === toKey || vn.lang.startsWith(`${toKey}-`),
            );
            if (versionIndex < 0) {
              const toLang = notEmptyString(toKey)
                ? toKey.split('|').shift()
                : '';
              if (toLang.length > 1 && googleTranslateCodes.includes(toLang)) {
                const { translation } = await this.snippetService.translateItem(
                  defaultLang.text,
                  toLang,
                  fromLang,
                );
                if (notEmptyString(translation)) {
                  values.push({
                    lang: toKey,
                    active: true,
                    approved: false,
                    text: translation,
                    modifiedAt: nowDt,
                    createdAt: nowDt,
                  });
                }
              }
            }
          }
        }
      }
    }
    const edited = { ...createSnippetDTO, values } as CreateSnippetDTO;
    const snippet = await this.snippetService.save(edited, overrideKey);
    return res.status(HttpStatus.OK).json({
      message: 'Snippet has been edited successfully',
      snippet,
    });
  }

  // Retrieve snippets list
  @Get('list/:lang?/:published?/:active?/:approved?')
  async list(
    @Res() res,
    @Param('lang') lang,
    @Param('published') published,
    @Param('active') active,
    @Param('approved') approved,
  ) {
    const langCode = smartCastString(lang, 'all');
    const baseLangCode = langCode.split('-').shift();
    const publishedMode = smartCastBool(published, true);
    const activeMode = smartCastBool(active, true);
    const approvedMode = smartCastBool(approved, true);
    const snippets = await this.snippetService.list(publishedMode);
    const filtered = snippets.map(record => {
      const snippet = record.toObject();
      const values = snippet.values
        .filter(val => {
          let valid = true;
          if (langCode !== 'all') {
            const baseLang = val.lang.split('-').shift();
            valid =
              val.lang === langCode ||
              baseLang === baseLangCode ||
              defaultLangCodes(baseLang).includes(baseLang);
          }
          if (activeMode && valid) {
            valid = val.active;
          }
          if (approvedMode && valid) {
            valid = val.approved;
          }
          return valid;
        })
        .map(val => {
          if (publishedMode) {
            const { lang, text } = val;
            return {
              lang,
              text,
            };
          } else {
            return val;
          }
        });
      return { ...snippet, values };
    });
    return res.status(HttpStatus.OK).json({
      valid: filtered.length > 0,
      items: filtered,
    });
  }

  // Retrieve snippets list
  @Get('by-category/:category')
  async byCategory(
    @Res() res,
    @Param('category') category,
    @Query() query,
  ) {
    const paramKeys = query instanceof Object ? Object.keys(query) : [];
    const langCode = paramKeys.includes('lang')? query.lang : 'all';
    const simple = paramKeys.includes('simple')? smartCastInt(query.simple, 0) > 0 : false;
    const baseLangCode = langCode.split('-').shift();
    const publishedMode = paramKeys.includes('published')? smartCastInt(query.published, 0) > 0 : false;
    const activeMode = paramKeys.includes('active')? smartCastInt(query.active, 0) > 0 : false;
    const approvedMode = paramKeys.includes('approved')? smartCastInt(query.approved, 0) > 0 : false;
    const snippets = await this.snippetService.list(publishedMode, false, category);
    const filtered = snippets.map(record => {
      const snippet = record.toObject();
      const values = snippet.values
        .filter(val => {
          let valid = true;
          if (langCode !== 'all') {
            const baseLang = val.lang.split('-').shift();
            valid =
              val.lang === langCode ||
              baseLang === baseLangCode ||
              defaultLangCodes(baseLang).includes(baseLang);
          }
          if (activeMode && valid) {
            valid = val.active;
          }
          if (approvedMode && valid) {
            valid = val.approved;
          }
          return valid;
        })
        .map(val => {
          if (publishedMode) {
            const { lang, text } = val;
            return {
              lang,
              text,
            };
          } else {
            return val;
          }
        });
      return { ...snippet, values };
    });
    const items = simple? filtered.map(row => {
      const {key, published, values } = row;
      return { key, text: values[0].text, published };
    }) : filtered;
    return res.status(HttpStatus.OK).json({
      valid: filtered.length > 0,
      items,
    });
  }

  // Retrieve snippets list
  @Get('categories')
  async categories(@Res() res) {
    const categories = await this.snippetService.categories();
    return res.status(HttpStatus.OK).json({
      valid: categories.length > 0,
      categories,
    });
  }

  // Retrieve snippets list
  @Get('last-modified/:langCode?/:category?')
  async lastModified(@Res() res, @Param('langCode') langCode, @Param('category') category) {
    const result = await this.snippetService.lastModified(langCode, category);
    const status = result.general > 0? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json(result);
  }

  // Fetch a particular snippet using ID
  @Get('item/:snippetID')
  async getSnippet(@Res() res, @Param('snippetID') snippetID) {
    const snippet = await this.snippetService.getSnippet(snippetID);
    if (!snippet) {
      throw new NotFoundException('Snippet does not exist!');
    }
    return res.status(HttpStatus.OK).json(snippet);
  }

  // Fetch a particular snippet using ID
  @Get('by-key/:key')
  async getSnippetByKey(@Res() res, @Param('key') key) {
    const snippet = await this.snippetService.getSnippetByKey(key);
    if (!snippet) {
      throw new NotFoundException('Snippet does not exist!');
    }
    return res.status(HttpStatus.OK).json(snippet);
  }

  @Get('by-key-start/:key')
  async getSnippetByKeyPattern(@Res() res, @Param('key') key) {
    const data = await this.snippetService.getSnippetByKeyStart(key);
    let valid = false;
    if (data instanceof Object) {
      const { snippet } = data;
      valid = snippet instanceof Object;
    }
    return res.status(HttpStatus.OK).json({ ...data, valid });
  }

  @Post('translate')
  async getTranslation(@Res() res, @Body() translateDTO: TranslateDTO) {
    const { from, to, text } = translateDTO;
    const source = notEmptyString(from) ? from : 'en';
    const target = notEmptyString(to) ? to : '';
    const data = googleTranslateCodes.includes(to)
      ? await this.snippetService.translateItem(text, target, source)
      : {};
    const valid = Object.keys(data).includes('translation');
    return res.status(HttpStatus.OK).json({ ...data, from, to, valid });
  }

  @Delete('delete/:key/:user/:unpub?')
  async delete(
    @Res() res,
    @Param('key') key,
    @Param('user') user,
    @Param('unpub') unpub,
  ) {
    let data: any = { valid: false, message: 'not authorised' };
    if (user.length > 10) {
      const unpublish = smartCastInt(unpub, 0) > 0;
      data = await this.snippetService.deleteByKey(key, unpublish);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Delete('bulk-delete/:prefix/:user')
  async bulkDelete(@Res() res, @Param('prefix') prefix, @Param('user') user) {
    const data: any = {
      valid: false,
      exportFile: '',
      prefix,
      message: 'not authorised',
    };

    if (this.userService.isAdminUser(user) && notEmptyString(prefix)) {
      data.items = await this.snippetService.allByCategory(prefix);
      data.numDeleted = data.items.length;
      data.exportFile = exportCollection('snippets', 'json', true);
      data.message = `valid prefix and user ID`;
      if (data.items.length > 0) {
        setTimeout(() => {
          this.snippetService.bulkDelete(prefix);
        }, 3000);
        data.message = `${data.items.length} snippets deleted`;
        data.valid = true;
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }
}
