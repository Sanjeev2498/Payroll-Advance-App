import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SiteOperationalStatus } from './create-site.dto';

export class SiteStatsDto {
  @ApiProperty({ description: 'Number of active assignments for this site' })
  assignments: number;

  @ApiProperty({ description: 'Number of scheduled shifts for this site' })
  shifts: number;
}

export class ClientSummaryDto {
  @ApiProperty({ description: 'Client unique identifier' })
  id: string;

  @ApiProperty({ description: 'Client name' })
  name: string;

  @ApiProperty({ description: 'Client contract status' })
  contractStatus: string;
}

export class SiteResponseDto {
  @ApiProperty({ description: 'Site unique identifier' })
  id: string;

  @ApiProperty({ description: 'Client ID that owns this site' })
  clientId: string;

  @ApiProperty({ description: 'Site name or identifier' })
  name: string;

  @ApiProperty({ description: 'Site physical address' })
  address: any;

  @ApiPropertyOptional({ description: 'Access requirements and security specifications' })
  accessRequirements?: any;

  @ApiPropertyOptional({ description: 'Safety protocols and procedures' })
  safetyProtocols?: any;

  @ApiProperty({ description: 'Site operational status', enum: SiteOperationalStatus })
  operationalStatus: SiteOperationalStatus;

  @ApiPropertyOptional({ description: 'Site contact information' })
  contactInfo?: any;

  @ApiProperty({ description: 'Site creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Client information', type: ClientSummaryDto })
  client?: ClientSummaryDto;

  @ApiPropertyOptional({ description: 'Site statistics', type: SiteStatsDto })
  _count?: SiteStatsDto;

  @ApiPropertyOptional({ description: 'Staffing requirements' })
  staffingRequirements?: any;

  @ApiPropertyOptional({ description: 'Contract details and rates' })
  contractDetails?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}

export class SiteListResponseDto {
  @ApiProperty({ description: 'List of sites', type: [SiteResponseDto] })
  sites: SiteResponseDto[];

  @ApiProperty({ description: 'Total number of sites' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class SiteStatsResponseDto {
  @ApiProperty({ description: 'Total number of sites' })
  total: number;

  @ApiProperty({ description: 'Number of active sites' })
  active: number;

  @ApiProperty({ description: 'Number of inactive sites' })
  inactive: number;

  @ApiProperty({ description: 'Number of sites under maintenance' })
  maintenance: number;

  @ApiProperty({ description: 'Number of suspended sites' })
  suspended: number;

  @ApiProperty({ description: 'Total number of assignments across all sites' })
  totalAssignments: number;

  @ApiProperty({ description: 'Average assignments per site' })
  averageAssignmentsPerSite: number;
}
