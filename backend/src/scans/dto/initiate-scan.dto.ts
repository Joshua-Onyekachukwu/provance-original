import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class InitiateScanDto {
  @IsString()
  originalFilename!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  fileSizeBytes!: number;

  @IsString()
  @IsIn(['image'])
  mediaType!: 'image';

  @IsOptional()
  @IsIn(['quick', 'standard', 'deep'])
  processingMode?: 'quick' | 'standard' | 'deep';
}
