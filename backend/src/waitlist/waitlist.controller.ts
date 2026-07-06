import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateWaitlistApplicationDto } from './dto/create-waitlist-application.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
@Throttle({ default: { limit: 8, ttl: 60_000 } })
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('applications')
  @HttpCode(HttpStatus.ACCEPTED)
  createApplication(@Body() dto: CreateWaitlistApplicationDto) {
    return this.waitlistService.createApplication(dto);
  }
}
