import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FailJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
