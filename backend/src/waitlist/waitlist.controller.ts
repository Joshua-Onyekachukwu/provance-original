import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateWaitlistApplicationDto } from './dto/create-waitlist-application.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('applications')
  @HttpCode(HttpStatus.ACCEPTED)
  createApplication(@Body() dto: CreateWaitlistApplicationDto) {
    return this.waitlistService.createApplication(dto);
  }
}
