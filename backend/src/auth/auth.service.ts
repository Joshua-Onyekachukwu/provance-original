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
    void dto;

    return {
      status: 'accepted',
      message:
        'Sign-in handling is being finalized. If your access is approved, continue through your invite or account email.',
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    void dto;

    return {
      status: 'accepted',
      message:
        'If an eligible account exists, password reset instructions will be sent through the configured recovery flow.',
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    void dto;

    return {
      status: 'accepted',
      message:
        'Password reset confirmation is being finalized. Complete token validation and password update logic before enabling account recovery.',
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    void dto;

    return {
      status: 'accepted',
      message:
        'Invite acceptance is being finalized. Complete invite lookup, account activation, and session creation before enabling access.',
    };
  }
}
