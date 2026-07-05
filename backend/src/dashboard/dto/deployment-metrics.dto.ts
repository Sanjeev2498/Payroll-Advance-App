import { ApiProperty } from '@nestjs/swagger';

export class SiteDeploymentDto {
  @ApiProperty({ description: 'Site unique identifier' })
  siteId: string;

  @ApiProperty({ description: 'Site name' })
  siteName: string;

  @ApiProperty({ description: 'Client name' })
  clientName: string;

  @ApiProperty({ description: 'Required number of guards' })
  requiredGuards: number;

  @ApiProperty({ description: 'Assigned number of guards' })
  assignedGuards: number;

  @ApiProperty({ description: 'Guards currently on duty' })
  onDutyGuards: number;

  @ApiProperty({ description: 'Number of vacant positions' })
  vacancies: number;

  @ApiProperty({ 
    description: 'Site operational status',
    enum: ['optimal', 'understaffed', 'critical', 'offline']
  })
  operationalStatus: 'optimal' | 'understaffed' | 'critical' | 'offline';
}

export class DeploymentMetricsDto {
  @ApiProperty({ description: 'Site deployment details', type: [SiteDeploymentDto] })
  siteDeployments: SiteDeploymentDto[];

  @ApiProperty({ description: 'Total number of deployments' })
  totalDeployments: number;

  @ApiProperty({ description: 'Number of optimal sites' })
  optimalSites: number;

  @ApiProperty({ description: 'Number of understaffed sites' })
  understaffedSites: number;

  @ApiProperty({ description: 'Number of critical sites' })
  criticalSites: number;
}