import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDTO } from './dto/create-message.dto';
import { isValidObjectId } from 'mongoose';
import { notEmptyString } from '../lib/validators';

@Controller('Message')
export class MessageController {
  constructor(private messageService: MessageService) {}

  // add a Message
  @Post('create')
  async addMessage(@Res() res, @Body() createMessageDTO: CreateMessageDTO) {
    const message = await this.messageService.addMessage(createMessageDTO);
    return res.status(HttpStatus.OK).json({
      msg: 'Message has been created successfully',
      message,
    });
  }

  @Put('edit/:msgId')
  async edit(
    @Res() res,
    @Param('msgId') msgId,
    @Body() createMessageDTO: CreateMessageDTO,
  ) {
    const hasRef = notEmptyString(msgId, 20);
    const hasValidRef = hasRef && isValidObjectId(msgId);
    let message = null;
    if (hasValidRef) {
      message = await this.messageService.updateMessage(
        msgId,
        createMessageDTO,
      );
    }
    const msg =
      message instanceof Object
        ? 'Message has been updated successfully'
        : 'Message not found';
    return res.status(HttpStatus.OK).json({
      msg,
      message,
    });
  }

  @Put('edit-set/:key')
  async saveByKey(
    @Res() res,
    @Param('key') key,
    @Body() items: CreateMessageDTO[],
    @Query() query,
  ) {
    const delRef = Object.keys(query).includes('del') ? query.del : '';
    const deleteIds = notEmptyString(delRef, 20) ? delRef.split(',') : [];
    const result = await this.messageService.updateByKey(key, items, deleteIds);
    const valid = result instanceof Object && result.items.length > 0;
    const msg = valid
      ? 'Message set has been updated successfully'
      : 'Invalid data';
    return res.status(HttpStatus.OK).json({
      valid,
      msg,
      result,
    });
  }

  // Retrieve Messages list
  @Get('list')
  async getAllMessage(@Res() res) {
    const messageSets = await this.messageService.listByKey();
    const valid = messageSets instanceof Array && messageSets.length > 0;
    const result = {
      valid,
      rows: messageSets,
    };
    return res.status(HttpStatus.OK).json(result);
  }

  // Fetch a particular Message using ID
  @Get('item/:messageID')
  async get(@Res() res, @Param('messageID') messageID) {
    const message = await this.messageService.getMessage(messageID);
    const status =
      message instanceof Object ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json(message);
  }

  // Fetch a particular Message by key
  @Get('by-key/:key')
  async getByKey(@Res() res, @Param('key') key) {
    const items = await this.messageService.getByKey(key);
    const valid = items.length > 0;
    const status = valid ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    const result = {
      valid,
      items: items,
    };
    return res.status(status).json(result);
  }
}
