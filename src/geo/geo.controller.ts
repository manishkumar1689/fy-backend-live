import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { GeoService } from './geo.service';
import { isNumeric, validISODateString, validLocationParameter } from '../lib/validators';
import { locStringToGeo } from '../astrologic/lib/converters';
import { currentISODate } from '../astrologic/lib/date-funcs';

@Controller('geo')
export class GeoController {
  constructor(private geoService: GeoService) {}

  @Get('by-coords/:loc')
  async byCoordinates(@Res() res, @Param('loc') loc) {
    let data: any = { valid: false };
    const coords = loc
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);
    let status = HttpStatus.NOT_ACCEPTABLE;
    if (coords.length > 1) {
      const [lat, lng] = coords;
      data = await this.geoService.fetchGeoData(lat, lng);
      if (data.valid) {
        status = HttpStatus.OK;
      }
    }
    return res.status(status).send(data);
  }

  @Get('google-by-coords/:loc/:code?')
  async googleByCoordinates(@Res() res, @Param('loc') loc, @Param('code') code) {
    let data: any = { valid: false };
    /* const coords = loc
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);
    if (coords.length > 1) {
      const [lat, lng] = coords;
      data = await this.geoService.googleNearby(lat, lng);
    } */
    data = await this.geoService.googleNearby(loc, code);
    return res.send(data);
  }

  @Get('geo-tz/:dt/:loc')
  async geoTzByCoordsDatetime(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    const coords = loc
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);

    if (coords.length > 1) {
      const [lat, lng] = coords;
      data = await this.geoService.fetchGeoAndTimezone(lat, lng, dt);
    }
    return res.send(data);
  }

  @Get('by-coords-date/:dt/:loc')
  async byCoordsDatetime(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    const coords = loc
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);

    if (coords.length > 1) {
      const [lat, lng] = coords;
      data = await this.geoService.fetchTimezoneOffset([lat, lng], dt);
    }
    return res.send(data);
  }

  @Get('placename/:search')
  async byPlacename(@Res() res, @Param('search') search) {
    const data = { valid: false, items: [] };
    if (search.length > 1) {
      const items = await this.geoService.searchByPlaceName(search);
      if (items instanceof Array) {
        data.items = items;
        data.valid = true;
      }
    }
    return res.send(data);
  }

  @Get('address/:search/:loc?/:skip?')
  async byFuzzyAddress(
    @Res() res,
    @Param('search') search,
    @Param('loc') loc,
    @Param('skip') skip: number,
  ) {
    const data = { valid: false, items: [] };
    const skipStored = skip > 0;

    const geo = validLocationParameter(loc)
      ? locStringToGeo(loc)
      : null;
    if (search.length > 1) {
      const result = await this.geoService.searchByFuzzyAddress(
        search,
        geo,
        skipStored,
      );
      if (result.items instanceof Array) {
        data.items = result.items;
        data.valid = true;
      }
    }
    return res.send(data);
  }

  @Get('timezonedb/:loc/:dt?')
  async timezoneDb(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    const data = { valid: false, result: {}, refDt: '' };
    const refDt = validISODateString(dt)? dt : currentISODate();
    if (validISODateString(refDt)) {
      const geo = locStringToGeo(loc);
      const result = await this.geoService.fetchTimezoneOffset(geo, refDt);
      if (result instanceof Object) {
        data.result = result;
        data.refDt = refDt;
        data.valid = true;
      }
    }
    return res.send(data);
  }
}
