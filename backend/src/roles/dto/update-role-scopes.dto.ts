import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateRoleScopesDto {
  /**
   * Full scope map for the role (all catalog keys → enabled). Values are
   * validated as booleans in the service so an unknown key can produce a
   * precise 400 naming the offending scope.
   */
  @ApiProperty({
    description: 'Full scope map for the role (catalog key → enabled).',
    example: { 'scans:read': true, 'scans:submit': false },
    additionalProperties: { type: 'boolean' },
  })
  @IsObject()
  scopes!: Record<string, boolean>;
}
