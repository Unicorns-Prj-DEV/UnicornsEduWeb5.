import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { StaffOpsClassController } from './staff-ops-class.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClassController, StaffOpsClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
