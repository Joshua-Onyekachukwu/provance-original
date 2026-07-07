import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { randomUUID } from 'crypto';

const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];

function parseOrigins(value: string | undefined): string[] {
  const configuredOrigins = (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_FRONTEND_ORIGINS, ...configuredOrigins])];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const frontendOrigins = parseOrigins(
    configService.get<string>('FRONTEND_ORIGIN'),
  );
  const trustProxy = configService.get<boolean>('TRUST_PROXY', true);
  const helmetEnabled = configService.get<boolean>('HELMET_ENABLED', true);

  if (trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use((req: Record<string, any>, res: Record<string, any>, next: () => void) => {
    const requestId =
      typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  if (helmetEnabled) {
    app.use(
      helmet({
        crossOriginResourcePolicy: false,
      }),
    );
  }

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: true,
  });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(configService.get<number>('PORT', 4000), '0.0.0.0');
}
bootstrap();
