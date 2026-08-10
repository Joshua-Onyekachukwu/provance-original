import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateMemberTeamDto {
  @ApiProperty({ description: 'Target team UUID for the member.' })
  @IsUUID()
  teamId: string;
}
