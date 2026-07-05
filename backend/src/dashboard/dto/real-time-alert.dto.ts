import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RealTimeAlertDto {
  @ApiProperty({ description: 'Alert unique identifier' })
  id: string;

  @ApiProperty({ 
    description: 'Alert type',
    enum: ['attendance', 'security', 'system', 'staffing']
  })
  type: 'attendance' | 'security' | 'system' | 'staffing';

  @ApiProperty({ 
    description: 'Alert severity',
    enum: ['low', 'medium', 'high', 'critical']
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Alert title' })
  title: string;

  @ApiProperty({ description: 'Alert description' })
  description: string;

  @ApiPropertyOptional({ description: 'Related site ID' })
  siteId?: string;

  @ApiPropertyOptional({ description: 'Related site name' })
  siteName?: string;

  @ApiPropertyOptional({ description: 'Related employee ID' })
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Related employee name' })
  employeeName?: string;

  @ApiProperty({ description: 'Alert timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Whether alert is acknowledged' })
  acknowledged: boolean;

  @ApiPropertyOptional({ description: 'Alert resolution timestamp' })
  resolvedAt?: string;
}