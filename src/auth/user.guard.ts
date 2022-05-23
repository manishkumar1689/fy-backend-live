import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { extractFromHeaderToken, maySkipValidation } from './auth.utils';
import { Request } from 'express';
import { UserService } from '../user/user.service';

@Injectable()
export class UserGuard implements CanActivate {
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

  async matchDynamic(headers): Promise<boolean> {
    const out = extractFromHeaderToken(headers, true);
    let valid = false;
    if (out.hasUid) {
      valid = await this.userService.isActive(out.uid);
    }
    return valid;
  }
}
