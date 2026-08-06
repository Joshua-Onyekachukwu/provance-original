import { IsUUID } from 'class-validator';

export class UpdateMemberTeamDto {
  @IsUUID()
  teamId: string;
}
