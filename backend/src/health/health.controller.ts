import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('health')
export class HealthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'provance-backend',
      version: '0.1.0',
      supabaseConfigured: this.supabaseService.isConfigured(),
      authMode: 'waitlist-first',
    };
  }
}
