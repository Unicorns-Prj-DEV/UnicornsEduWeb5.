import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UniojService } from './unioj.service';
import { UniojController } from './unioj.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, ConfigModule, PrismaModule],
  controllers: [UniojController],
  providers: [UniojService],
  exports: [UniojService],
})
export class UniojModule {}
