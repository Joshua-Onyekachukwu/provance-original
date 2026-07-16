import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  roleTitle?: string;

  @IsOptional()
  @IsIn(['individual', 'team'])
  defaultWorkspace?: 'individual' | 'team';

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
