import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsNotEmpty, IsString } from 'class-validator';

export class UpdateSecuritySettingDto {
  @ApiProperty({
    description: 'Setting key (e.g. two_factor, session_timeout_minutes).',
    example: 'two_factor',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  // The value shape is key-dependent (boolean flags vs. { enabled } objects
  // vs. numbers) — validation happens in SecurityService.updateSetting.
  @ApiProperty({
    description:
      'Key-dependent value: boolean flag, { enabled } object, or number.',
    oneOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'object' }],
  })
  @Allow()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}
