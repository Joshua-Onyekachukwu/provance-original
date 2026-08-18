import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
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
  const configService = new ConfigService();

  // ── Sentry error tracking ─────────────────────────────────────────────────
  // Only initializes when SENTRY_DSN is set (production deployments).
  // In dev, errors stay in the console — no external service needed.
  const sentryDsn = configService.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get<string>('NODE_ENV', 'development'),
      tracesSampleRate: 0.1, // 10% of transactions
      // Only instrument the NestJS HTTP layer
      integrations: [Sentry.nestIntegration()],
    });
  }

  const app = await NestFactory.create(AppModule, {
    // Wire Sentry as a diagnostic logger so NestJS errors flow to the
    // Sentry dashboard automatically (before the custom exception filter).
    ...(sentryDsn ? { logger: ['log', 'warn', 'error', 'debug', 'verbose'] } : {}),
  });
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
  // Better Auth now mounts as a controller (BetterAuthModule →
  // /v1/better-auth/*), flag-gated by USE_BETTER_AUTH; the live GoTrue flow
  // at /v1/auth/* is untouched. better-call's node adapter falls back to the
  // pre-parsed req.body, so running after Nest's body parser is safe.
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

  // ── OpenAPI / Swagger UI at /v1/docs ─────────────────────────────────────
  // Self-documenting API (docs/engineering/API_DESIGN_STANDARDS.md). The
  // document is generated from route metadata + the @ApiProperty-decorated
  // DTOs, so the schema mirrors the live surface. useGlobalPrefix mounts the
  // UI under the v1 prefix (paths render as /v1/... in the spec too).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Provance API')
    .setDescription(
      'REST API for the Provance media-verification platform — the schema ' +
        'mirrors the mock contract the frontend consumes (see ' +
        'docs/engineering/API_DESIGN_STANDARDS.md).',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(configService.get<number>('PORT', 4000), '0.0.0.0');
}
bootstrap();
