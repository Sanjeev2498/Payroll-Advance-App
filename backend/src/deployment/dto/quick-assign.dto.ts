import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class QuickAssignDto {
  @ApiProperty({ description: 'Site ID to assign guard to' })
  @IsString()
  siteId: string;

  @ApiProperty({ 
    description: 'Guard ID to assign (optional - system will find best match if not provided)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  guardId?: string;
}