import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateWaitlistApplicationDto } from './dto/create-waitlist-application.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async createApplication(dto: CreateWaitlistApplicationDto) {
    const client = this.supabaseService.getAdminClient();
    const tableName =
      this.configService.get<string>('SUPABASE_WAITLIST_TABLE') || 'waitlist_applications';

    if (!client) {
      return {
        status: 'accepted',
        integrationStatus: 'pending_supabase_configuration',
        message:
          'Waitlist request validated. Connect Supabase and create the waitlist_applications table to persist submissions.',
        application: {
          email: dto.email,
          fullName: dto.fullName,
          state: 'waitlist_submitted',
        },
      };
    }

    const { data, error } = await client
      .from(tableName)
      .insert({
        email: dto.email.toLowerCase(),
        full_name: dto.fullName,
        company: dto.company ?? null,
        role_title: dto.roleTitle ?? null,
        use_case: dto.useCase,
        status: 'waitlist_submitted',
      })
      .select('id, email, status, created_at')
      .single();

    if (error) {
      throw new ServiceUnavailableException({
        message: 'Waitlist persistence failed.',
        details: error.message,
      });
    }

    return {
      status: 'accepted',
      integrationStatus: 'persisted',
      message: 'Waitlist request received.',
      application: data,
    };
  }
}
