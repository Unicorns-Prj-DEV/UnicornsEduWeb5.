import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(readonly configService: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('DATABASE_URL'),
      }),
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
