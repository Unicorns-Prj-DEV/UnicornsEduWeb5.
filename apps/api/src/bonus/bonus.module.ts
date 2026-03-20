import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { BonusController } from './bonus.controller';
import { BonusService } from './bonus.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule, ActionHistoryModule],
  controllers: [BonusController],
  providers: [BonusService, PrismaService],
})
export class BonusModule { }
