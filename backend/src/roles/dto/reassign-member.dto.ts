import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReassignMemberDto {
  /** RBAC role id to move the member to (e.g. 'role_analyst'). */
  @ApiProperty({
    description: 'RBAC role id to move the member to (e.g. role_analyst).',
    example: 'role_analyst',
  })
  @IsString()
  roleId!: string;
}
