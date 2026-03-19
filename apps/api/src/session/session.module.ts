import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffOpsSessionController } from './staff-ops-session.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SessionController, StaffOpsSessionController],
  providers: [SessionService],
})
export class SessionModule {}
