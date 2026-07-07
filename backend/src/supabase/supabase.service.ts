import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SupabaseClient,
  SupabaseClientOptions,
  createClient,
} from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient | null;
  private readonly url: string | null;
  private readonly anonKey: string | null;
  private readonly serviceRoleKey: string | null;
  private readonly clientOptions: SupabaseClientOptions<'public'>;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('SUPABASE_URL') ?? null;
    this.anonKey = this.configService.get<string>('SUPABASE_ANON_KEY') ?? null;
    this.serviceRoleKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? null;
    this.clientOptions = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    };

    this.adminClient =
      this.url && this.serviceRoleKey
        ? createClient(this.url, this.serviceRoleKey, this.clientOptions)
        : null;
  }

  isConfigured(): boolean {
    return this.adminClient !== null && this.url !== null && this.anonKey !== null;
  }

  getAdminClient(): SupabaseClient | null {
    return this.adminClient;
  }

  createPublicClient(accessToken?: string): SupabaseClient | null {
    if (!this.url || !this.anonKey) {
      return null;
    }

    // Auth flows mutate in-memory session state, so each request gets its own client.
    return createClient(this.url, this.anonKey, {
      ...this.clientOptions,
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    });
  }
}
