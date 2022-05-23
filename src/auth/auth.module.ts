import { Module, HttpModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from '../user/user.service';
import { UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  providers: [UserService],
})
export class AuthModule {}
