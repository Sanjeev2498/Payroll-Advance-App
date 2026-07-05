import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject } from 'class-validator';

export class ResolveConflictDto {
  @ApiProperty({ 
    description: 'Resolution action to take', 
    enum: ['reassign', 'adjust_schedule', 'split_assignment'] 
  })
  @IsEnum(['reassign', 'adjust_schedule', 'split_assignment'])
  action: 'reassign' | 'adjust_schedule' | 'split_assignment';

  @ApiProperty({ description: 'Additional details for the resolution' })
  @IsObject()
  details: Record<string, any>;
}