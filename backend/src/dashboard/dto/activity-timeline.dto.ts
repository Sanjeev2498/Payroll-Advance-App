import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityTimelineUserDto {
  @ApiProperty({ description: 'User full name' })
  name: string;

  @ApiProperty({ description: 'User role' })
  role: string;
}

export class ActivityTimelineItemDto {
  @ApiProperty({ description: 'Timeline item unique identifier' })
  id: string;

  @ApiProperty({ 
    description: 'Activity type',
    enum: ['attendance', 'assignment', 'payroll', 'billing', 'alert']
  })
  type: 'attendance' | 'assignment' | 'payroll' | 'billing' | 'alert';

  @ApiProperty({ description: 'Activity title' })
  title: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'Activity timestamp' })
  timestamp: string;

  @ApiPropertyOptional({ 
    description: 'Activity severity',
    enum: ['low', 'medium', 'high', 'critical']
  })
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({ description: 'User who triggered the activity', type: ActivityTimelineUserDto })
  user?: ActivityTimelineUserDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}