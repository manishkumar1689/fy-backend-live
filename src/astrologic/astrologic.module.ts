import { Module, HttpModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AstrologicController } from './astrologic.controller';
import { AstrologicService } from './astrologic.service';
import { GeoService } from './../geo/geo.service';
import { ChartSchema } from './schemas/chart.schema';
import { PairedChartSchema } from './schemas/paired-chart.schema';
import { BodySpeedSchema } from './schemas/body-speed.schema';
import { LexemeSchema } from '../dictionary/schemas/lexeme.schema';
import { DictionaryService } from './../dictionary/dictionary.service';
import { UserService } from './../user/user.service';
import { UserSchema } from '../user/schemas/user.schema';
import { GeoNameSchema } from '../geo/schemas/geo-name.schema';
import { SettingSchema } from '../setting/schemas/setting.schema';
import { SettingService } from '../setting/setting.service';
import { ProtocolSchema } from '../setting/schemas/protocol.schema';
import { PredictiveRuleSetSchema } from '../setting/schemas/predictive-rule-set.schema';
import { AnswerSetSchema } from '../user/schemas/answer-set.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'BodySpeed', schema: BodySpeedSchema },
      { name: 'Chart', schema: ChartSchema },
      { name: 'Lexeme', schema: LexemeSchema },
      { name: 'User', schema: UserSchema },
      { name: 'AnswerSet', schema: AnswerSetSchema },
      { name: 'PairedChart', schema: PairedChartSchema },
      { name: 'GeoName', schema: GeoNameSchema },
      { name: 'Setting', schema: SettingSchema },
      { name: 'Protocol', schema: ProtocolSchema },
      { name: 'PredictiveRuleSet', schema: PredictiveRuleSetSchema },
    ]),
  ],
  controllers: [AstrologicController],
  providers: [
    AstrologicService,
    GeoService,
    DictionaryService,
    UserService,
    SettingService,
  ],
})
export class AstrologicModule {}
