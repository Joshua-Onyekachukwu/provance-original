import { IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
