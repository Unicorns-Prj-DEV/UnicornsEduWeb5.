import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffOperationsAccessService } from './staff-operations-access.service';

@Module({
  imports: [PrismaModule],
  providers: [StaffOperationsAccessService],
  exports: [StaffOperationsAccessService],
})
export class StaffOperationsModule {}
