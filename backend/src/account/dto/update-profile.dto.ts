import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Display name.', required: false, maxLength: 120, example: 'Founder Admin' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiProperty({ description: 'Organization name.', required: false, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  organization?: string;

  @ApiProperty({ description: 'Role title.', required: false, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  roleTitle?: string;

  @ApiProperty({
    description: 'Default workspace scope.',
    enum: ['individual', 'team'],
    required: false,
  })
  @IsOptional()
  @IsIn(['individual', 'team'])
  defaultWorkspace?: 'individual' | 'team';

  @ApiProperty({ description: 'Email notification preference.', required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
