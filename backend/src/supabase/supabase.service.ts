import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient | null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.adminClient =
      url && serviceRoleKey
        ? createClient(url, serviceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          })
        : null;
  }

  isConfigured(): boolean {
    return this.adminClient !== null;
  }

  getAdminClient(): SupabaseClient | null {
    return this.adminClient;
  }
}
