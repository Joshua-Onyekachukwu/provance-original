import { IsEmail, IsIn, IsOptional, IsUUID } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member' = 'member';

  @IsOptional()
  @IsUUID()
  team?: string;
}
