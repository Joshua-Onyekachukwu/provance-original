import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsUUID } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ description: 'Email of the invited user.', example: 'jane.analyst@provance.local' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role granted on acceptance (defaults to member).',
    enum: ['admin', 'member'],
    default: 'member',
    required: false,
  })
  @IsOptional()
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member' = 'member';

  @ApiProperty({
    description: 'Team UUID the invitee lands in (falls back to the default team).',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  team?: string;
}
