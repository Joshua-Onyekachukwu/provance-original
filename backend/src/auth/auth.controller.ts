import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { AuthService } from './auth.service';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
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

  @Post('invites/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}
