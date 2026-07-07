import { ConnectionOptions } from 'bullmq';

export function createRedisConnection(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === 'rediss:';
  const db = parsed.pathname ? Number.parseInt(parsed.pathname.slice(1), 10) : undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: Number.isInteger(db) ? db : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? {} : undefined,
  };
}
