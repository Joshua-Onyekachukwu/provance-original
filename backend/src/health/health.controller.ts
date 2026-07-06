import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  getHealth() {
    return {
      status: 'ok',
      service: 'provance-backend',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
