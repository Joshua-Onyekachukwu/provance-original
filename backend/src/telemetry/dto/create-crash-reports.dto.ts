import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * One crash record — mirrors the client's buildCrashRecord shape
 * (src/lib/telemetry.js) exactly, so the wire contract is the literal
 * buffered record. Field names stay snake_case to match what the client
 * already produces.
 */
export class CrashReportDto {
  @ApiProperty({ description: 'Persisted client id.', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  client_id!: string;

  @ApiProperty({ description: 'Error class / type.', required: false, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @ApiProperty({ description: 'Error message.', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiProperty({ description: 'Error stack trace.', required: false, maxLength: 6000 })
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  stack?: string;

  @ApiProperty({ description: 'React component stack.', required: false, maxLength: 6000 })
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  component_stack?: string;

  @ApiProperty({ description: 'Route where the error occurred.', required: false, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  route?: string;

  @ApiProperty({ description: 'Browser user agent.', required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  user_agent?: string;

  @ApiProperty({ description: 'Signed-in user id, if any.', required: false, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  user_id?: string;

  @ApiProperty({ description: 'Signed-in user email, if any.', required: false, maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @ApiProperty({ description: 'Free-form metadata.', required: false })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  @ApiProperty({ description: 'ISO timestamp of the crash.', required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class CreateCrashReportsDto {
  @ApiProperty({
    description: 'Buffered crash records (max 50 per flush).',
    type: () => [CrashReportDto],
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CrashReportDto)
  errors!: CrashReportDto[];
}
