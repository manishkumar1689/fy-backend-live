import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DictionaryService } from './dictionary.service';
import { DictionaryController } from './dictionary.controller';
import { LexemeSchema } from './schemas/lexeme.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Lexeme', schema: LexemeSchema }]),
  ],
  providers: [DictionaryService],
  controllers: [DictionaryController],
})
export class DictionaryModule {}
