import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Worker } from 'bullmq';
import { AppModule } from './app.module';
import { createRedisConnection } from './queue/queue.connection';
import { SCAN_PROCESSING_QUEUE_NAME } from './queue/queue.constants';
import { ScansService } from './scans/scans.service';

async function bootstrapWorker() {
  const logger = new Logger('ScanWorker');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const configService = app.get(ConfigService);
  const scansService = app.get(ScansService);
  const redisUrl = configService.get<string>('REDIS_URL');

  if (!redisUrl) {
    logger.error('REDIS_URL is not configured. Worker cannot start.');
    await app.close();
    process.exit(1);
  }

  const queueName = configService.get<string>(
    'SCAN_PROCESSING_QUEUE_NAME',
    SCAN_PROCESSING_QUEUE_NAME,
  );
  const concurrency = configService.get<number>('WORKER_CONCURRENCY', 4);
  const connection = createRedisConnection(redisUrl);

  const worker = new Worker(
    queueName,
    async (job) => {
      const scanId = typeof job.data?.scanId === 'string' ? job.data.scanId : null;

      if (!scanId) {
        throw new Error('Job does not include a valid scanId.');
      }

      await scansService.processQueuedScan(scanId);
    },
    {
      connection,
      concurrency,
    },
  );

  worker.on('ready', () => {
    logger.log(`Worker is ready for queue "${queueName}" with concurrency ${concurrency}.`);
  });

  worker.on('completed', (job) => {
    logger.log(`Completed scan job ${job.id ?? 'unknown'}.`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`Scan job ${job?.id ?? 'unknown'} failed: ${error.message}`);
  });

  const shutdown = async () => {
    logger.log('Shutting down worker.');
    await worker.close();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void bootstrapWorker();
