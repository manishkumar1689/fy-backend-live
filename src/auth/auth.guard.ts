import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { extractFromHeaderToken, maySkipValidation } from './auth.utils';
import { globalApikey } from '../.config';
import { Request } from 'express';
import { IncomingHttpHeaders } from 'http';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  validateRequest(request: Request) {
    let valid = maySkipValidation(request);
    if (!valid) {
      const { headers } = request;
      valid = this.matchDynamic(headers);
    }
    return valid;
  }

  matchApiKey(headers) {
    let valid = false;
    if (headers instanceof Object) {
      const { apikey } = headers;
      valid = apikey === globalApikey;
    }
    return valid;
  }

  matchDynamic(headers: IncomingHttpHeaders): boolean {
    const out = extractFromHeaderToken(headers, false);
    return out.valid;
  }
}
