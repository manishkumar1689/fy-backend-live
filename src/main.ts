import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/auth.guard';
import { port } from './.config';
import { urlencoded, json } from 'express';
/* import * as fs from 'fs';

const listEndpoints = (app) => {
  const server = app.getHttpServer();
  const router = server._events.request._router;
  const availableRoutes: [] = router.stack
    .map(layer => {
      if (layer.route) {
        return {
          route: {
            path: layer.route?.path,
            method: layer.route?.stack[0].method,
          },
        };
      }
    })
    .filter(item => item !== undefined);
    fs.writeFileSync('endpoints.json', JSON.stringify(availableRoutes));
} */

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalGuards(new AuthGuard());
  app.use(json({ limit: '200mb' }));
  app.use(urlencoded({ extended: true, limit: '200mb' }));
  await app.listen(port);
}
bootstrap();
