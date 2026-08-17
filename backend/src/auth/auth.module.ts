import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { SecurityModule } from '../security/security.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshLockoutInterceptor } from './refresh-lockout.interceptor';

@Module({
  imports: [AccountModule, SecurityModule],
  controllers: [AuthController],
  providers: [AuthService, RefreshLockoutInterceptor],
  exports: [AuthService],
})
export class AuthModule {}
