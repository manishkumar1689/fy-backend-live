import {HttpModule, Module } from '@nestjs/common';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingSchema } from './schemas/setting.schema';
import { UserService } from './../user/user.service';
import { UserSchema } from '../user/schemas/user.schema';
import { ProtocolSchema } from './schemas/protocol.schema';
import { PredictiveRuleSetSchema } from './schemas/predictive-rule-set.schema';
import { PublicUserSchema } from '../user/schemas/public-user.schema';
import { AnswerSetSchema } from '../user/schemas/answer-set.schema';
import { SnippetSchema } from '../snippet/schemas/snippet.schema';
import { SnippetService } from '../snippet/snippet.service';
import { TranslatedItemSchema } from '../snippet/schemas/translated-item.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Setting', schema: SettingSchema },
      { name: 'Protocol', schema: ProtocolSchema },
      { name: 'PredictiveRuleSet', schema: PredictiveRuleSetSchema },
      { name: 'User', schema: UserSchema },
      { name: 'PublicUser', schema: PublicUserSchema },
      { name: 'AnswerSet', schema: AnswerSetSchema },
      { name: 'Snippet', schema: SnippetSchema },
      { name: 'TranslatedItem', schema: TranslatedItemSchema },

    ]),
  ],
  providers: [SettingService, UserService, SnippetService],
  controllers: [SettingController],
})
export class SettingModule {}
