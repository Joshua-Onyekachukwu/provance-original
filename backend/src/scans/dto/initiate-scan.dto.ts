import { IsIn, IsInt, IsString, Min } from 'class-validator';

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
}
