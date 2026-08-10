import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({
    description: 'Invite validity in days (1–30, default 7).',
    required: false,
    minimum: 1,
    maximum: 30,
    example: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
