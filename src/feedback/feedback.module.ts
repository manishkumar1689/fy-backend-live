import { Module, HttpModule } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { UserService } from '../user/user.service';
import { UserSchema } from '../user/schemas/user.schema';
import { PublicUserSchema } from '../user/schemas/public-user.schema';
import { AnswerSetSchema } from '../user/schemas/answer-set.schema';
import { FeedbackSchema } from './schemas/feedback.schema';
import { FlagSchema } from './schemas/flag.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingSchema } from '../setting/schemas/setting.schema';
import { SettingService } from '../setting/setting.service';
import { ProtocolSchema } from '../setting/schemas/protocol.schema';
import { PredictiveRuleSetSchema } from '../setting/schemas/predictive-rule-set.schema';
import { SnippetService } from '../snippet/snippet.service';
import { SnippetSchema } from '../snippet/schemas/snippet.schema';
import { TranslatedItemSchema } from '../snippet/schemas/translated-item.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Feedback', schema: FeedbackSchema },
      { name: 'Flag', schema: FlagSchema },
      { name: 'User', schema: UserSchema },
      { name: 'PublicUser', schema: PublicUserSchema },
      { name: 'AnswerSet', schema: AnswerSetSchema },
      { name: 'Setting', schema: SettingSchema },
      { name: 'Protocol', schema: ProtocolSchema },
      { name: 'PredictiveRuleSet', schema: PredictiveRuleSetSchema },
      { name: 'Snippet', schema: SnippetSchema },
      { name: 'TranslatedItem', schema: TranslatedItemSchema },
    ]),
  ],
  providers: [FeedbackService, UserService, SettingService, SnippetService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
