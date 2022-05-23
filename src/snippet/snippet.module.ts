import { HttpModule, Module } from '@nestjs/common';
import { SnippetController } from './snippet.controller';
import { SnippetService } from './snippet.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SnippetSchema } from './schemas/snippet.schema';
import { TranslatedItemSchema } from './schemas/translated-item.schema';
import { UserSchema } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';
import { PublicUserSchema } from '../user/schemas/public-user.schema';
import { AnswerSetSchema } from '../user/schemas/answer-set.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Snippet', schema: SnippetSchema },
      { name: 'TranslatedItem', schema: TranslatedItemSchema },
      { name: 'User', schema: UserSchema },
      { name: 'PublicUser', schema: PublicUserSchema },
      { name: 'AnswerSet', schema: AnswerSetSchema },
    ]),
  ],
  providers: [SnippetService, UserService],
  controllers: [SnippetController],
})
export class SnippetModule {}
