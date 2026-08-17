import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  getBilling(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.getBilling(user.id);
  }
}
