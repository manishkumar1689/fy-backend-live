import { NestFactory } from '@nestjs/core';
import { AstrologicModule } from '../astrologic.module';
import * as expressListRoutes from 'express-list-routes';

export const generateApiRouteMap = async () => {
  const app = await NestFactory.create(AstrologicModule);
  const server = app.getHttpServer();
  //const router = server._events.request._router;
 
  return [];
}

/*const transformRoutes = (data) => {
  return data.filter(item => item.hasOwnProperty('route') && item.route instanceof Object).map(item => {
    const { keys, route } = item;
    let path = "---";
    if (route instanceof Object) {
      path = route.path;
    }
    const parts = path.substring(1).split('/');
    parts.shift()._events.request;
    const method = parts.shift();
    const isodate = "YYYY-MM-DDThh:mm:ss";
    let query = [];
    switch (method) {
      case 'juldate':
        query = [
          { name: "dt", format: isodate, notes: "isodate, overrides other query parameters" },
          { name: "y", format: "integer", notes: "year" },
          { name: "m", format: "integer", notes: "month" },
          { name: "d", format: "integer", notes: "day of month" },
          { name: "h", format: "float", notes: "decimal hours" },
          { name: "hrs", format: "integer", notes: "hour(s)" },
          { name: "min", format: "integer", notes: "minute(s)" },
          { name: "sec", format: "second", notes: "second(s)" },
        ]
        break;
      case 'swe':
        query = [
          { name: "dt", format: isodate, notes: "isodate with calc" },
          { name: "jd", format: "float", notes: "julian date" },
          { name: "planet", format: "integer", notes: "body number with calc" },
          { name: "params", format: "param1,param2,param3", notes: "comma-separated string depending on target function" },
        ]
        break;
    }
    const params = keys.map(k => {
      const { name, optional } = k;
      let format = "string";
      let notes = "";
      switch (name) {
        case 'dt':
        case 'isodate':
          format = isodate;
          break;
        case 'loc':
          format = "0.0000,0.0000[,0]";
          notes = "latitude,longitude[,altitude]";
          break;
        case 'planet':
          format = "integer";
          notes = "body number";
          break;
        case 'system':
          format = "character";
          notes = "house system letter/numeral";
          break;
        case 'mode':
          switch (method) {
            case 'bodies':
              notes = "(all|core|asteroids)";
              break;
          }
          break;
      }
      return { name, optional, format, notes };
    });
    return { path, params, query }
  })
}*/