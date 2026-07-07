import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue } from 'bullmq';
import { createRedisConnection } from './queue.connection';
import { SCAN_PROCESSING_QUEUE_NAME } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queueName: string;
  private readonly redisUrl: string | null;
  private readonly queue: Queue | null;

  constructor(private readonly configService: ConfigService) {
    this.queueName = this.configService.get<string>(
      'SCAN_PROCESSING_QUEUE_NAME',
      SCAN_PROCESSING_QUEUE_NAME,
    );
    this.redisUrl = this.configService.get<string>('REDIS_URL')?.trim() || null;
    const connection = this.redisUrl ? createRedisConnection(this.redisUrl) : null;
    this.queue = connection
      ? new Queue(this.queueName, {
          connection,
        })
      : null;

    if (!this.queue) {
      this.logger.warn(
        'REDIS_URL is not configured. Scan jobs will fall back to inline processing.',
      );
    }
  }

  isConfigured(): boolean {
    return this.queue !== null;
  }

  async enqueueScanProcessing(scanId: string) {
    if (!this.queue) {
      throw new Error('Queue is not configured.');
    }

    const options: JobsOptions = {
      jobId: scanId,
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    };

    return this.queue.add('process-scan', { scanId }, options);
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }
}
