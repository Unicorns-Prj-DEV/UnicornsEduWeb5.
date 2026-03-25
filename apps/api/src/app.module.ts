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
import { BonusModule } from './bonus/bonus.module';
import { ExtraAllowanceModule } from './extra-allowance/extra-allowance.module';
import { CodeforcesModule } from './codeforces/codeforces.module';
import { CfProblemTutorialModule } from './cf-problem-tutorial/cf-problem-tutorial.module';
import { SessionModule } from './session/session.module';
import { CustomerCareModule } from './customer-care/customer-care.module';
import { ActionHistoryModule } from './action-history/action-history.module';
import { LessonModule } from './lesson/lesson.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    StudentModule,
    StaffModule,
    ClassModule,
    CostModule,
    BonusModule,
    ExtraAllowanceModule,
    CodeforcesModule,
    CfProblemTutorialModule,
    SessionModule,
    CustomerCareModule,
    ActionHistoryModule,
    LessonModule,
    DashboardModule,
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
