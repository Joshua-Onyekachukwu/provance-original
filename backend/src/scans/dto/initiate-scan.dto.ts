import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class InitiateScanDto {
  @ApiProperty({ description: 'Original filename of the uploaded asset.', example: 'evidence-photo-01.jpg' })
  @IsString()
  originalFilename!: string;

  @ApiProperty({ description: 'MIME type of the asset.', example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'Size of the asset in bytes.', example: 4_200_000, minimum: 1 })
  @IsInt()
  @Min(1)
  fileSizeBytes!: number;

  @ApiProperty({ description: 'Media family of the asset.', enum: ['image'], example: 'image' })
  @IsString()
  @IsIn(['image'])
  mediaType!: 'image';

  @ApiProperty({
    description: 'Processing depth; defaults to standard when omitted.',
    enum: ['quick', 'standard', 'deep'],
    required: false,
    example: 'standard',
  })
  @IsOptional()
  @IsIn(['quick', 'standard', 'deep'])
  processingMode?: 'quick' | 'standard' | 'deep';
}
