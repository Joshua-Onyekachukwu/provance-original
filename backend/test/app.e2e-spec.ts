import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { MigrationHealthService } from './../src/health/migration-health.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Keep the e2e hermetic: the migration-diff check probes the live
      // Supabase schema at boot (onModuleInit) — stub it here so the health
      // spec never depends on the network or the real DB state.
      .overrideProvider(MigrationHealthService)
      .useValue({ check: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ok');
        expect(response.body.service).toBe('provance-backend');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
