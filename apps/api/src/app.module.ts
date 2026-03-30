import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { PrismaModule } from './prisma/prisma.module';

function parsePositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue = Number.parseInt(value ?? '', 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: parsePositiveIntegerEnv(
          process.env.THROTTLE_DEFAULT_TTL_MS,
          60_000,
        ),
        limit: parsePositiveIntegerEnv(process.env.THROTTLE_DEFAULT_LIMIT, 300),
        blockDuration: parsePositiveIntegerEnv(
          process.env.THROTTLE_DEFAULT_BLOCK_DURATION_MS,
          60_000,
        ),
      },
    ]),
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
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
