import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SePayService } from './sepay.service';
import { SePayWebhookController } from './sepay-webhook.controller';
import { SePayWebhookService } from './sepay-webhook.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 45_000,
      maxRedirects: 3,
    }),
    PrismaModule,
    MailModule,
  ],
  controllers: [SePayWebhookController],
  providers: [SePayService, SePayWebhookService],
  exports: [SePayService, SePayWebhookService],
})
export class SePayModule {}
