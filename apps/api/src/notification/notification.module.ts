import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ActionHistoryModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
