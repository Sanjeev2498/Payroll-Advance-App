import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsString, IsArray, MinLength, MaxLength } from 'class-validator';

export enum IncidentType {
  SECURITY_BREACH = 'SECURITY_BREACH',
  EQUIPMENT_MALFUNCTION = 'EQUIPMENT_MALFUNCTION',
  STAFF_ISSUE = 'STAFF_ISSUE',
  SAFETY_CONCERN = 'SAFETY_CONCERN',
  VISITOR_ISSUE = 'VISITOR_ISSUE',
  MAINTENANCE_REQUEST = 'MAINTENANCE_REQUEST',
  EMERGENCY = 'EMERGENCY',
  OTHER = 'OTHER',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
}

export enum ComplaintType {
  SERVICE_QUALITY = 'SERVICE_QUALITY',
  STAFF_BEHAVIOR = 'STAFF_BEHAVIOR',
  BILLING_ISSUE = 'BILLING_ISSUE',
  RESPONSE_TIME = 'RESPONSE_TIME',
  EQUIPMENT_ISSUE = 'EQUIPMENT_ISSUE',
  COMMUNICATION_ISSUE = 'COMMUNICATION_ISSUE',
  OTHER = 'OTHER',
}

export enum ComplaintStatus {
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum RequestType {
  GUARD_REPLACEMENT = 'GUARD_REPLACEMENT',
  ADDITIONAL_COVERAGE = 'ADDITIONAL_COVERAGE',
  SCHEDULE_CHANGE = 'SCHEDULE_CHANGE',
  EQUIPMENT_REQUEST = 'EQUIPMENT_REQUEST',
  TRAINING_REQUEST = 'TRAINING_REQUEST',
  SERVICE_MODIFICATION = 'SERVICE_MODIFICATION',
  OTHER = 'OTHER',
}

export enum RequestUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY',
}

export class IncidentReportDto {
  @ApiProperty({
    description: 'Incident ID',
    example: 'inc-789',
  })
  id: string;

  @ApiProperty({
    description: 'Incident type',
    enum: IncidentType,
  })
  type: IncidentType;

  @ApiProperty({
    description: 'Incident title/summary',
    example: 'Unauthorized person attempted site entry',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed description of the incident',
    example: 'An individual without proper authorization attempted to enter through the main gate at approximately 14:30.',
  })
  description: string;

  @ApiProperty({
    description: 'Site where incident occurred',
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
    description: 'Guard who reported the incident',
    example: {
      id: 'emp-456',
      name: 'John Doe',
      employeeNumber: 'EMP001',
    },
    required: false,
  })
  reportedBy?: {
    id: string;
    name: string;
    employeeNumber: string;
  };

  @ApiProperty({
    description: 'Incident severity level',
    enum: IncidentSeverity,
  })
  severity: IncidentSeverity;

  @ApiProperty({
    description: 'Current status of the incident',
    enum: IncidentStatus,
  })
  status: IncidentStatus;

  @ApiProperty({
    description: 'When the incident occurred',
    example: '2024-01-15T14:30:00Z',
  })
  occurredAt: string;

  @ApiProperty({
    description: 'When the incident was reported',
    example: '2024-01-15T14:35:00Z',
  })
  reportedAt: string;

  @ApiProperty({
    description: 'Actions taken to address the incident',
    example: 'Security guard denied entry and requested proper identification. Supervisor notified.',
  })
  actionsTaken?: string;

  @ApiProperty({
    description: 'Evidence attachments (photos, documents, etc.)',
    example: [
      {
        id: 'att-1',
        fileName: 'incident_photo_001.jpg',
        fileType: 'image/jpeg',
        fileSize: 245760,
        uploadedAt: '2024-01-15T14:40:00Z',
        url: 'https://example.com/attachments/att-1',
      },
    ],
  })
  attachments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    url: string;
  }>;

  @ApiProperty({
    description: 'Follow-up actions required',
    example: 'Review access control procedures with security team',
  })
  followUpRequired?: string;

  @ApiProperty({
    description: 'Resolution details',
    example: 'Access control procedures reviewed and updated. Additional training provided to guards.',
  })
  resolution?: string;

  @ApiProperty({
    description: 'When the incident was resolved',
    example: '2024-01-16T10:00:00Z',
  })
  resolvedAt?: string;
}

export class CreateComplaintDto {
  @ApiProperty({
    description: 'Type of complaint',
    enum: ComplaintType,
  })
  @IsEnum(ComplaintType)
  type: ComplaintType;

  @ApiProperty({
    description: 'Subject/title of the complaint',
    example: 'Guard was late for shift',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'The security guard assigned to morning shift was 30 minutes late without prior notice.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: 'Site where the issue occurred',
    example: 'site-789',
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Guard/employee involved (if applicable)',
    example: 'emp-456',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  guardId?: string;

  @ApiProperty({
    description: 'Priority level of the complaint',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiProperty({
    description: 'Additional evidence or supporting documents',
    example: ['photo1.jpg', 'document1.pdf'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class CreateServiceRequestDto {
  @ApiProperty({
    description: 'Type of service request',
    enum: RequestType,
  })
  @IsEnum(RequestType)
  type: RequestType;

  @ApiProperty({
    description: 'Request title/subject',
    example: 'Additional guard needed for weekend coverage',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Detailed request description',
    example: 'We need an additional security guard for this weekend due to a special event.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: 'Site for the service request',
    example: 'site-789',
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Urgency level of the request',
    enum: RequestUrgency,
  })
  @IsEnum(RequestUrgency)
  urgency: RequestUrgency;

  @ApiProperty({
    description: 'Preferred start date/time for the request',
    example: '2024-01-20T08:00:00Z',
  })
  @IsString()
  preferredDate: string;

  @ApiProperty({
    description: 'Duration of the request (if applicable)',
    example: 'Weekend coverage (Saturday-Sunday)',
    required: false,
  })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiProperty({
    description: 'Special requirements or notes',
    example: 'Guard should have event security experience',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialRequirements?: string;
}

export class CommunicationResponseDto {
  @ApiProperty({
    description: 'Recent incident reports for client sites',
    type: [IncidentReportDto],
  })
  incidentReports: IncidentReportDto[];

  @ApiProperty({
    description: 'Client complaints and their status',
    example: [
      {
        id: 'comp-123',
        type: 'SERVICE_QUALITY',
        subject: 'Guard was late for shift',
        status: 'INVESTIGATING',
        submittedAt: '2024-01-15T09:00:00Z',
        priority: 'MEDIUM',
      },
    ],
  })
  complaints: Array<{
    id: string;
    type: ComplaintType;
    subject: string;
    status: ComplaintStatus;
    submittedAt: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }>;

  @ApiProperty({
    description: 'Service requests and their status',
    example: [
      {
        id: 'req-456',
        type: 'GUARD_REPLACEMENT',
        title: 'Additional guard needed',
        status: 'APPROVED',
        submittedAt: '2024-01-14T15:30:00Z',
        urgency: 'HIGH',
      },
    ],
  })
  serviceRequests: Array<{
    id: string;
    type: RequestType;
    title: string;
    status: string;
    submittedAt: string;
    urgency: RequestUrgency;
  }>;

  @ApiProperty({
    description: 'Communication statistics',
    example: {
      totalIncidents: 12,
      openComplaints: 2,
      pendingRequests: 1,
      avgResolutionTime: 24,
    },
  })
  statistics: {
    totalIncidents: number;
    openComplaints: number;
    pendingRequests: number;
    avgResolutionTime: number; // in hours
  };
}