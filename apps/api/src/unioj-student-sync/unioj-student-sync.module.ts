import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UniojStudentSyncClient } from './unioj-student-sync.client';
import { UniojStudentSyncController } from './unioj-student-sync.controller';
import { UniojStudentSyncJob } from './unioj-student-sync.job';
import { UniojStudentSyncService } from './unioj-student-sync.service';

@Module({
  imports: [HttpModule, ConfigModule, PrismaModule],
  controllers: [UniojStudentSyncController],
  providers: [
    UniojStudentSyncClient,
    UniojStudentSyncService,
    UniojStudentSyncJob,
  ],
  exports: [UniojStudentSyncService],
})
export class UniojStudentSyncModule {}
