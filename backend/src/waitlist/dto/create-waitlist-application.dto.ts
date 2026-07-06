import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWaitlistApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleTitle?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(1200)
  useCase!: string;
}
