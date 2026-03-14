import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CodeforcesController } from './codeforces.controller';
import { CodeforcesService } from './codeforces.service';

@Module({
  imports: [ConfigModule],
  controllers: [CodeforcesController],
  providers: [CodeforcesService],
  exports: [CodeforcesService],
})
export class CodeforcesModule {}
