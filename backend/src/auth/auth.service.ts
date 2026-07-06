import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async signIn(dto: SignInDto) {
    return {
      status: 'pending',
      message:
        'Sign-in wiring is prepared. Connect Supabase auth or your preferred identity provider to enable credential validation.',
      authConfigured: this.supabaseService.isConfigured(),
      email: dto.email.toLowerCase(),
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    return {
      status: 'pending',
      message:
        'Password reset wiring is prepared. Connect Supabase auth email recovery or your mail provider to send reset instructions.',
      authConfigured: this.supabaseService.isConfigured(),
      email: dto.email.toLowerCase(),
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    return {
      status: 'pending',
      message:
        'Password reset confirmation endpoint is scaffolded. Connect token validation and password update logic before enabling this route.',
      authConfigured: this.supabaseService.isConfigured(),
      tokenPreview: dto.token.slice(0, 8),
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    return {
      status: 'pending',
      message:
        'Invite acceptance is scaffolded. Connect invite lookup, account activation, and session creation before enabling this route.',
      authConfigured: this.supabaseService.isConfigured(),
      tokenPreview: dto.token.slice(0, 8),
      fullName: dto.fullName,
    };
  }
}
