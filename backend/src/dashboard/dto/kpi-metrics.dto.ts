import { ApiProperty } from '@nestjs/swagger';

export class AttendanceStatusDto {
  @ApiProperty({ description: 'Number of present employees' })
  present: number;

  @ApiProperty({ description: 'Number of late employees' })
  late: number;

  @ApiProperty({ description: 'Number of absent employees' })
  absent: number;

  @ApiProperty({ description: 'Total scheduled employees' })
  totalScheduled: number;
}

export class PayrollStatusDto {
  @ApiProperty({ description: 'Number of processed payroll items' })
  processed: number;

  @ApiProperty({ description: 'Number of pending payroll items' })
  pending: number;

  @ApiProperty({ description: 'Total payroll amount', type: 'number' })
  totalAmount: number;

  @ApiProperty({ description: 'Next payroll run date' })
  nextRunDate: string;
}

export class PendingApprovalsDto {
  @ApiProperty({ description: 'Pending attendance approvals' })
  attendance: number;

  @ApiProperty({ description: 'Pending assignment approvals' })
  assignments: number;

  @ApiProperty({ description: 'Pending payroll approvals' })
  payroll: number;

  @ApiProperty({ description: 'Total pending approvals' })
  total: number;
}

export class BillingOverviewDto {
  @ApiProperty({ description: 'Monthly revenue amount', type: 'number' })
  monthlyRevenue: number;

  @ApiProperty({ description: 'Outstanding invoices count' })
  outstandingInvoices: number;

  @ApiProperty({ description: 'Paid invoices count' })
  paidInvoices: number;

  @ApiProperty({ description: 'Total amount billed', type: 'number' })
  totalBilled: number;
}

export class KPIMetricsDto {
  @ApiProperty({ description: 'Number of active guards' })
  activeGuards: number;

  @ApiProperty({ description: 'Number of active sites' })
  activeSites: number;

  @ApiProperty({ description: 'Number of guards currently on duty' })
  guardsOnDuty: number;

  @ApiProperty({ description: 'Number of vacant positions' })
  vacantPositions: number;

  @ApiProperty({ description: 'Attendance status breakdown', type: AttendanceStatusDto })
  attendanceStatus: AttendanceStatusDto;

  @ApiProperty({ description: 'Payroll status overview', type: PayrollStatusDto })
  payrollStatus: PayrollStatusDto;

  @ApiProperty({ description: 'Pending approvals breakdown', type: PendingApprovalsDto })
  pendingApprovals: PendingApprovalsDto;

  @ApiProperty({ description: 'Billing overview metrics', type: BillingOverviewDto })
  billingOverview: BillingOverviewDto;
}