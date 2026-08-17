import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member (owner edits are rejected).',
    enum: ['admin', 'member'],
    example: 'admin',
  })
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member';
}
