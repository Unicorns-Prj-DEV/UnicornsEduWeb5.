import { Module } from '@nestjs/common';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserController } from './user.controller';
import { UserProfileController } from './user-profile.controller';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [UserController, UserProfileController],
  providers: [UserService],
})
export class UserModule {}
