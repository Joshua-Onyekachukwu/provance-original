import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateFeatureFlagDto {
  @ApiProperty({ description: 'Whether the flag is enabled.', example: true })
  @IsBoolean()
  enabled!: boolean;
}
