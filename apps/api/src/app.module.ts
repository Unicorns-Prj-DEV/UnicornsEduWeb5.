import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { UserModule } from './user/user.module';
import { StudentModule } from './student/student.module';
import { StaffModule } from './staff/staff.module';
import { ClassModule } from './class/class.module';
import { CostModule } from './cost/cost.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    StudentModule,
    StaffModule,
    ClassModule,
    CostModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RolesGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
