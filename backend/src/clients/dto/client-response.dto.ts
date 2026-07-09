import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from './create-client.dto';
import { ContractStatus as PrismaContractStatus } from '@prisma/client';

export class ClientStatsDto {
  @ApiProperty({ description: 'Number of sites for this client' })
  sites: number;

  @ApiPropertyOptional({ description: 'Number of active assignments' })
  activeAssignments?: number;

  @ApiPropertyOptional({ description: 'Total revenue generated' })
  totalRevenue?: number;

  @ApiPropertyOptional({ description: 'Number of invoices' })
  invoices?: number;
}

export class ClientPerformanceMetricsDto {
  @ApiProperty({ description: 'Service quality score (1-10)' })
  serviceQualityScore: number;

  @ApiProperty({ description: 'Payment timeliness score (1-10)' })
  paymentTimelinessScore: number;

  @ApiProperty({ description: 'Contract compliance score (1-10)' })
  contractComplianceScore: number;

  @ApiProperty({ description: 'Overall satisfaction rating (1-5)' })
  satisfactionRating: number;

  @ApiProperty({ description: 'Number of complaints this year' })
  complaintsThisYear: number;

  @ApiProperty({ description: 'Number of escalations this year' })
  escalationsThisYear: number;

  @ApiProperty({ description: 'Average response time in hours' })
  avgResponseTime: number;
}

export class ClientResponseDto {
  @ApiProperty({ description: 'Client unique identifier' })
  id: string;

  @ApiProperty({ description: 'Client company name' })
  name: string;

  @ApiProperty({ description: 'Primary contact email' })
  contactEmail: string;

  @ApiPropertyOptional({ description: 'Additional contact information' })
  contactInfo?: any;

  @ApiProperty({ description: 'Contract status', enum: ContractStatus })
  contractStatus: ContractStatus;

  @ApiPropertyOptional({ description: 'Contract start date' })
  contractStart?: Date;

  @ApiPropertyOptional({ description: 'Contract end date' })
  contractEnd?: Date;

  @ApiPropertyOptional({ description: 'Billing preferences' })
  billingPreferences?: any;

  @ApiPropertyOptional({ description: 'Industry sector' })
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size category' })
  companySize?: string;

  @ApiPropertyOptional({ description: 'Service level agreement' })
  serviceLevelAgreement?: any;

  @ApiPropertyOptional({ description: 'Required documents for onboarding' })
  documentRequirements?: any[];

  @ApiPropertyOptional({ description: 'Onboarding checklist items' })
  onboardingChecklist?: any[];

  @ApiPropertyOptional({ description: 'Contract renewal notification days' })
  renewalNotificationDays?: number;

  @ApiPropertyOptional({ description: 'Auto-renewal enabled' })
  autoRenewalEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Client-specific tags' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Account manager user ID' })
  accountManagerId?: string;

  @ApiProperty({ description: 'Client creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Client statistics', type: ClientStatsDto })
  _count?: ClientStatsDto;

  @ApiPropertyOptional({ description: 'Performance metrics', type: ClientPerformanceMetricsDto })
  performanceMetrics?: ClientPerformanceMetricsDto;
}

export class ClientListResponseDto {
  @ApiProperty({ description: 'List of clients', type: [ClientResponseDto] })
  clients: ClientResponseDto[];

  @ApiProperty({ description: 'Total number of clients' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class ClientStatsResponseDto {
  @ApiProperty({ description: 'Total number of clients' })
  total: number;

  @ApiProperty({ description: 'Number of active clients' })
  active: number;

  @ApiProperty({ description: 'Number of pending clients' })
  pending?: number;

  @ApiProperty({ description: 'Number of suspended clients' })
  suspended: number;

  @ApiProperty({ description: 'Number of expired clients' })
  expired: number;

  @ApiProperty({ description: 'Number of terminated clients' })
  terminated: number;

  @ApiProperty({ description: 'Number of contracts expiring this month' })
  expiringThisMonth: number;

  @ApiProperty({ description: 'Number of contracts expiring next month' })
  expiringNextMonth?: number;

  @ApiProperty({ description: 'Total contract value (active contracts)' })
  totalContractValue?: number;

  @ApiProperty({ description: 'Average contract duration in months' })
  avgContractDuration?: number;

  @ApiProperty({ description: 'Client acquisition this month' })
  acquisitionThisMonth?: number;

  @ApiProperty({ description: 'Client retention rate percentage' })
  retentionRate?: number;
}

export class OnboardingStatusDto {
  @ApiProperty({ description: 'Onboarding completion percentage' })
  completionPercentage: number;

  @ApiProperty({ description: 'Completed checklist items' })
  completedItems: number;

  @ApiProperty({ description: 'Total checklist items' })
  totalItems: number;

  @ApiProperty({ description: 'Documents collected' })
  documentsCollected: number;

  @ApiProperty({ description: 'Documents required' })
  documentsRequired: number;

  @ApiProperty({ description: 'Onboarding status', example: 'IN_PROGRESS' })
  status: string;

  @ApiProperty({ description: 'Expected completion date' })
  expectedCompletion?: Date;
}

export class ContractRenewalInfoDto {
  @ApiProperty({ description: 'Days until contract expiry' })
  daysUntilExpiry: number;

  @ApiProperty({ description: 'Renewal status', example: 'PENDING_REVIEW' })
  renewalStatus: string;

  @ApiProperty({ description: 'Renewal notification sent' })
  notificationSent: boolean;

  @ApiProperty({ description: 'Last renewal discussion date' })
  lastDiscussionDate?: Date;

  @ApiProperty({ description: 'Renewal probability score (1-10)' })
  renewalProbability: number;
}
