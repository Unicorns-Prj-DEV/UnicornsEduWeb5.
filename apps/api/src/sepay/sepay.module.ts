import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SePayService } from './sepay.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 45_000,
      maxRedirects: 3,
    }),
  ],
  providers: [SePayService],
  exports: [SePayService],
})
export class SePayModule {}
