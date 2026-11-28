import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UniojStudentSyncService } from './unioj-student-sync.service';

@Injectable()
export class UniojStudentSyncJob {
  private readonly logger = new Logger(UniojStudentSyncJob.name);
  private running = false;

  constructor(private readonly sync: UniojStudentSyncService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    // Lượt trước chưa xong (UNIOJ chậm) thì bỏ lượt này, tránh chồng request.
    if (this.running) return;
    this.running = true;
    try {
      const { sent, failed } = await this.sync.syncTick();
      if (sent || failed) {
        this.logger.log(`UNIOJ student sync: sent ${sent}, failed ${failed}`);
      }
    } catch (error) {
      this.logger.error('UNIOJ student sync tick failed', error as Error);
    } finally {
      this.running = false;
    }
  }
}
