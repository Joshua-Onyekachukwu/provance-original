import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewWaitlistDto {
  @ApiProperty({
    description: 'New waitlist status.',
    enum: ['under_review', 'approved', 'rejected', 'deferred'],
    example: 'approved',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['under_review', 'approved', 'rejected', 'deferred'])
  status!: 'under_review' | 'approved' | 'rejected' | 'deferred';

  @ApiProperty({ description: 'Reviewer notes.', required: false, maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
