import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  FAILED = 'FAILED',
}

export class ClientInvoiceQueryDto {
  @ApiProperty({
    description: 'Client ID for invoice data',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'Filter by invoice status',
    enum: InvoiceStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiProperty({
    description: 'Start date for invoice period (ISO format)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'End date for invoice period (ISO format)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class InvoiceLineItemDto {
  @ApiProperty({
    description: 'Description of the service',
    example: 'Security Guard Services - Main Office',
  })
  description: string;

  @ApiProperty({
    description: 'Site information',
    example: {
      id: 'site-789',
      name: 'Main Office',
      address: '123 Business District',
    },
  })
  site: {
    id: string;
    name: string;
    address: string;
  };

  @ApiProperty({
    description: 'Service period',
    example: {
      from: '2024-01-01',
      to: '2024-01-31',
    },
  })
  period: {
    from: string;
    to: string;
  };

  @ApiProperty({
    description: 'Quantity (hours or units)',
    example: 720,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'hours',
  })
  unit: string;

  @ApiProperty({
    description: 'Rate per unit',
    example: 250.0,
  })
  rate: number;

  @ApiProperty({
    description: 'Total amount for this line item',
    example: 180000.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Breakdown of hours or services',
    example: {
      regularHours: 640,
      overtimeHours: 80,
      holidayHours: 0,
    },
  })
  breakdown: {
    regularHours?: number;
    overtimeHours?: number;
    holidayHours?: number;
    [key: string]: any;
  };
}

export class InvoiceDto {
  @ApiProperty({
    description: 'Invoice ID',
    example: 'inv-123',
  })
  id: string;

  @ApiProperty({
    description: 'Invoice number',
    example: 'INV-2024-001',
  })
  invoiceNumber: string;

  @ApiProperty({
    description: 'Client information',
    example: {
      id: 'client-456',
      name: 'ABC Corporation',
      contactEmail: 'billing@abc.com',
      billingAddress: '456 Corporate Avenue, Business District',
    },
  })
  client: {
    id: string;
    name: string;
    contactEmail: string;
    billingAddress: string;
  };

  @ApiProperty({
    description: 'Billing period',
    example: {
      start: '2024-01-01',
      end: '2024-01-31',
    },
  })
  billingPeriod: {
    start: string;
    end: string;
  };

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatus,
  })
  status: InvoiceStatus;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: 'Invoice line items',
    type: [InvoiceLineItemDto],
  })
  lineItems: InvoiceLineItemDto[];

  @ApiProperty({
    description: 'Subtotal amount',
    example: 180000.0,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 32400.0,
  })
  taxAmount: number;

  @ApiProperty({
    description: 'Total amount',
    example: 212400.0,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Amount paid',
    example: 212400.0,
  })
  amountPaid: number;

  @ApiProperty({
    description: 'Outstanding amount',
    example: 0.0,
  })
  outstandingAmount: number;

  @ApiProperty({
    description: 'Invoice date',
    example: '2024-02-01T00:00:00Z',
  })
  invoiceDate: string;

  @ApiProperty({
    description: 'Due date',
    example: '2024-02-15T00:00:00Z',
  })
  dueDate: string;

  @ApiProperty({
    description: 'Payment terms',
    example: '15 days from invoice date',
  })
  paymentTerms: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Thank you for your business',
    required: false,
  })
  notes?: string;
}

export class ClientBillingResponseDto {
  @ApiProperty({
    description: 'Invoice dashboard metrics',
    example: {
      totalInvoices: 12,
      pendingInvoices: 3,
      paidInvoices: 8,
      overdueInvoices: 1,
      totalAmountDue: 50000.0,
      totalPaid: 200000.0,
    },
  })
  dashboardMetrics: {
    totalInvoices: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    totalAmountDue: number;
    totalPaid: number;
  };

  @ApiProperty({
    description: 'List of invoices',
    type: [InvoiceDto],
  })
  invoices: InvoiceDto[];

  @ApiProperty({
    description: 'Billing history summary',
    example: [
      {
        month: '2024-01',
        totalAmount: 212400.0,
        status: 'PAID',
        paymentDate: '2024-02-10',
      },
    ],
  })
  billingHistory: Array<{
    month: string;
    totalAmount: number;
    status: PaymentStatus;
    paymentDate?: string;
  }>;

  @ApiProperty({
    description: 'Service charges breakdown',
    example: {
      securityServices: 180000.0,
      overtime: 20000.0,
      specialServices: 5000.0,
      taxes: 32400.0,
    },
  })
  chargesBreakdown: {
    securityServices: number;
    overtime: number;
    specialServices: number;
    taxes: number;
    [key: string]: number;
  };

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 12,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class InvoiceDownloadResponseDto {
  @ApiProperty({
    description: 'Invoice PDF download URL',
    example: 'https://example.com/invoices/inv-123.pdf',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'File name for download',
    example: 'INV-2024-001.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 245760,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Content type',
    example: 'application/pdf',
  })
  contentType: string;

  @ApiProperty({
    description: 'Generated timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  generatedAt: string;
}