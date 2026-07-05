import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationItemDto {
  @ApiProperty({ description: 'Notification unique identifier' })
  id: string;

  @ApiProperty({ 
    description: 'Notification type',
    enum: ['system', 'payroll', 'compliance', 'attendance', 'billing']
  })
  type: 'system' | 'payroll' | 'compliance' | 'attendance' | 'billing';

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({ description: 'Notification timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Whether notification is read' })
  read: boolean;

  @ApiProperty({ 
    description: 'Notification severity',
    enum: ['info', 'warning', 'error', 'success']
  })
  severity: 'info' | 'warning' | 'error' | 'success';

  @ApiPropertyOptional({ description: 'Whether action is required' })
  actionRequired?: boolean;

  @ApiPropertyOptional({ description: 'Action URL for notification' })
  actionUrl?: string;
}