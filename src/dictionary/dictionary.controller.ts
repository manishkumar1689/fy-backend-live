import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Res,
  Req,
  Param,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { CreateLexemeDTO } from './dto/create-lexeme.dto';
import { Lexeme } from './interfaces/lexeme.interface';
import { Translation } from './interfaces/translation.interface';
import { notEmptyString } from '../lib/validators';
import { TranslationDTO } from './dto/translation.dto';

const mapTranslation = (item: Translation): any => {
  const keys = ['lang', 'text', 'type', 'alpha'];
  const mp = new Map<string, any>();
  keys.forEach(k => {
    mp.set(k, item[k]);
  });
  return Object.fromEntries(mp);
};

const mapLexeme = (item: Lexeme): any => {
  const keys = ['key', 'lang', 'name', 'original', 'unicode', 'translations'];
  const mp = new Map<string, any>();
  keys.forEach(k => {
    switch (k) {
      case 'translations':
        mp.set(k, item.translations.map(mapTranslation));
        break;
      default:
        mp.set(k, item[k]);
        break;
    }
  });
  return Object.fromEntries(mp);
};

@Controller('dictionary')
export class DictionaryController {
  constructor(private dictionaryService: DictionaryService) {}

  @Get('list/:ref?')
  async listAll(@Res() res, @Param('ref') ref) {
    const filter = new Map<string, any>();
    if (notEmptyString(ref, 1)) {
      const filterType = ref.length < 3 ? 'init' : 'category';
      const filterVal =
        filterType === 'category' && ref.includes(',') ? ref.split(',') : ref;
      const filterKey = filterVal instanceof Array ? 'categories' : filterType;
      filter.set(filterKey, filterVal);
    }
    let result: any = { valid: false };
    const items = await this.dictionaryService.getAll(
      Object.fromEntries(filter),
    );
    if (items instanceof Array) {
      result = { valid: true, items: items.map(mapLexeme) };
    }
    return res.status(HttpStatus.OK).send(result);
  }

  @Get('categories')
  async listCategories(@Res() res) {
    let result: any = { valid: false };
    const categories = await this.dictionaryService.getCategories();
    if (categories instanceof Array) {
      result = { valid: true, categories };
    }
    return res.status(HttpStatus.OK).send(result);
  }

  @Get('categories-keys')
  async listCategoriesKeys(@Res() res) {
    let result: any = { valid: false };
    const categories = await this.dictionaryService.getCategoriesAndKeys();
    if (categories instanceof Array) {
      result = { valid: true, categories };
    }
    return res.status(HttpStatus.OK).send(result);
  }

  // add a lexeme
  @Post('save')
  async saveLexeme(@Res() res, @Body() createLexemeDTO: CreateLexemeDTO) {
    let lexeme = await this.dictionaryService.getByKey(createLexemeDTO.key);
    let message = 'Lexeme has been created successfully';
    if (lexeme) {
      lexeme = await this.dictionaryService.updateLexeme(
        createLexemeDTO.key,
        createLexemeDTO,
      );
      message = 'Lexeme has been saved successfully';
    } else {
      lexeme = await this.dictionaryService.addLexeme(createLexemeDTO);
    }
    return res.status(HttpStatus.OK).json({
      message,
      lexeme,
    });
  }

  @Put('edit/:key')
  async editLexeme(
    @Res() res,
    @Param('key') key,
    @Body() createLexemeDTO: CreateLexemeDTO,
  ) {
    const lexeme = await this.dictionaryService.updateLexeme(
      key,
      createLexemeDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Lexeme has been updated successfully',
      lexeme,
    });
  }

  @Put('add-translation/:key')
  async addTranslation(
    @Res() res,
    @Param('key') key,
    @Body() translationDTO: TranslationDTO,
  ) {
    const lexeme = await this.dictionaryService.saveTranslationByKey(
      key,
      translationDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Lexeme has been updated successfully',
      lexeme,
    });
  }

  @Delete('delete/:key/:user')
  async deleteLexeme(@Res() res, @Param('key') key, @Param('user') user) {
    let data: any = { valid: false, message: 'not authorised' };
    if (user.length > 10) {
      data = await this.dictionaryService.deleteLexemeByKey(key);
    }
    return res.status(HttpStatus.OK).json(data);
  }
}
