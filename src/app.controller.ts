import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { UserService } from './user/user.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly userService: UserService,
  ) {}

  @Get()
  welcome(@Res() res): string {
    const welcomeData = {
      valid: true,
      msg: 'Welcome to Finding you API',
    };
    return res.status(HttpStatus.OK).json(welcomeData);
  }
}
