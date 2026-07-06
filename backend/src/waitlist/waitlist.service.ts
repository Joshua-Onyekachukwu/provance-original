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
        message: 'Your waitlist request has been received.',
        application: {
          email: dto.email.toLowerCase(),
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
      throw new ServiceUnavailableException(
        'Waitlist service is temporarily unavailable.',
      );
    }

    return {
      status: 'accepted',
      message: 'Waitlist request received.',
      application: data,
    };
  }
}
