import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { extractFromHeaderToken, maySkipValidation } from './auth.utils';
import { Request } from 'express';
import { UserService } from '../user/user.service';
import { IncomingHttpHeaders } from 'http';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    return await this.validateRequest(request);
  }

  async validateRequest(request: Request) {
    let valid = maySkipValidation(request);
    if (!valid) {
      const { headers } = request;
      valid = await this.matchDynamic(headers);
    }
    return valid;
  }

  async matchDynamic(headers: IncomingHttpHeaders): Promise<boolean> {
    const out = extractFromHeaderToken(headers, true);
    let valid = false;
    if (out.hasUid) {
      valid = await this.userService.isAdminUser(out.uid);
      headers.uid = out.uid;
    }
    return valid;
  }
}
