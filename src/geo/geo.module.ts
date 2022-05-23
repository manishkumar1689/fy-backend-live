import { Module, HttpModule } from '@nestjs/common';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { GeoNameSchema } from './schemas/geo-name.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: 'GeoName', schema: GeoNameSchema }]),
  ],
  providers: [GeoService],
  controllers: [GeoController],
})
export class GeoModule {}
