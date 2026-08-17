import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import {
  buildCookieSessionOptions,
  clearAllRefreshCookies,
  readRefreshCookie,
  setRefreshCookie,
} from './cookie-session.util';
import { requestSessionMeta } from '../security/session-meta.util';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { AuthService } from './auth.service';
import { RefreshLockoutInterceptor } from './refresh-lockout.interceptor';
import { SignInLockoutInterceptor } from './sign-in-lockout.interceptor';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { SignInDto } from './dto/sign-in.dto';

type AuthSessionResponse = {
  status: string;
  message: string;
  user?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  session?: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: number | null;
    tokenType?: string;
  };
};

@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AuthController {
  private readonly cookieOptions;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    this.cookieOptions = buildCookieSessionOptions({
      enabled: configService.get<boolean>('AUTH_COOKIE_ENABLED', true),
      sameSite: configService.get<string>('AUTH_COOKIE_SAME_SITE', 'lax'),
      secure: configService.get<boolean>('AUTH_COOKIE_SECURE', false),
      maxAgeDays: configService.get<number>('AUTH_COOKIE_MAX_AGE_DAYS', 30),
    });
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getCurrentSession(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getCurrentSession(user);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(SignInLockoutInterceptor)
  async signIn(
    @Res({ passthrough: true }) response: Response,
    @Body() dto: SignInDto,
  ): Promise<AuthSessionResponse> {
    const result = await this.authService.signIn(
      dto,
      requestSessionMeta(response.req),
    );

    if (
      this.cookieOptions.enabled &&
      result.status === 'authenticated' &&
      result.session?.refreshToken
    ) {
      setRefreshCookie(response, result.session.refreshToken, this.cookieOptions);
    }

    return stripRefreshTokenFromBody(result, this.cookieOptions.enabled);
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(RefreshLockoutInterceptor)
  async refreshSession(
    @Res({ passthrough: true }) response: Response,
    @Body() dto: RefreshSessionDto,
  ): Promise<AuthSessionResponse> {
    const cookieRefreshToken = this.cookieOptions.enabled
      ? readRefreshCookie(response.req, this.cookieOptions.cookieName)
      : null;
    const result = await this.authService.refreshSession(
      {
        refreshToken: cookieRefreshToken ?? dto.refreshToken,
      },
      requestSessionMeta(response.req),
      // Where the presented credential came from — recorded on rejection so
      // the admin audit trail can distinguish cookie vs body-token replays.
      cookieRefreshToken ? 'cookie' : 'body',
    );

    if (
      this.cookieOptions.enabled &&
      result.status === 'authenticated' &&
      result.session?.refreshToken
    ) {
      // Rotation: every refresh issues a fresh refresh token (Supabase
      // invalidates the previous one), and the cookie carries the new value.
      setRefreshCookie(response, result.session.refreshToken, this.cookieOptions);
    }

    return stripRefreshTokenFromBody(result, this.cookieOptions.enabled);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: string; message: string }> {
    const cookieRefreshToken = this.cookieOptions.enabled
      ? readRefreshCookie(response.req, this.cookieOptions.cookieName)
      : null;

    const result = await this.authService.signOut(cookieRefreshToken);

    if (this.cookieOptions.enabled) {
      // Clear every refresh-cookie name (plain + __Host-) so a stale cookie
      // from a deployment name transition cannot linger after sign-out.
      clearAllRefreshCookies(response, this.cookieOptions);
    }

    return result;
  }

  @Post('invites/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}

function stripRefreshTokenFromBody(
  result: AuthSessionResponse,
  cookieEnabled: boolean,
): AuthSessionResponse {
  if (!cookieEnabled || !result.session) {
    return result;
  }

  return {
    ...result,
    session: {
      accessToken: result.session.accessToken,
      expiresAt: result.session.expiresAt ?? null,
      tokenType: result.session.tokenType,
    },
  };
}
