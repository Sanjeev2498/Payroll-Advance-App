import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for storing encrypted field data
 */
export class EncryptedFieldDto {
  @ApiProperty({ description: 'Encrypted data' })
  @IsString()
  @IsOptional()
  encryptedData?: string;

  @ApiProperty({ description: 'Initialization vector' })
  @IsString()
  @IsOptional()
  iv?: string;

  @ApiProperty({ description: 'Authentication tag' })
  @IsString()
  @IsOptional()
  tag?: string;
}

/**
 * Base interface for role-based data visibility
 */
export interface RoleBasedResponse {
  id: string;
  // Public fields (always visible)
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  
  // Role-based fields (conditionally visible/masked)
  email?: string;
  phone?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  hourlyRate?: string;
  
  // Metadata
  canViewSensitive?: boolean;
  canViewRestricted?: boolean;
  canViewFinancial?: boolean;
}

/**
 * Employee response for different role interfaces
 */
export class EmployeeRoleResponse implements RoleBasedResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  employeeNumber: string;

  @ApiProperty({ required: false, description: 'Email (role-dependent visibility)' })
  email?: string;

  @ApiProperty({ required: false, description: 'Phone (role-dependent visibility)' })
  phone?: string;

  @ApiProperty({ required: false, description: 'Aadhaar (Admin only)' })
  aadhaarNumber?: string;

  @ApiProperty({ required: false, description: 'PAN (Admin only)' })
  panNumber?: string;

  @ApiProperty({ required: false, description: 'Hourly rate (Admin only)' })
  hourlyRate?: string;

  @ApiProperty()
  skills: string[];

  @ApiProperty()
  employmentStatus: string;

  @ApiProperty()
  hireDate: string;

  @ApiProperty({ required: false })
  terminationDate?: string;

  // Role capability flags
  @ApiProperty()
  canViewSensitive: boolean;

  @ApiProperty()
  canViewRestricted: boolean;

  @ApiProperty()
  canViewFinancial: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

/**
 * Assignment response for different role interfaces
 */
export class AssignmentRoleResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  siteId: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ required: false })
  responsibilities?: any;

  @ApiProperty({ required: false, description: 'Hourly rate (Admin only)' })
  hourlyRate?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty({ required: false })
  endDate?: string;

  // Employee basic info (always visible)
  @ApiProperty({ required: false })
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    skills: string[];
  };

  // Site basic info (always visible) 
  @ApiProperty({ required: false })
  site?: {
    id: string;
    name: string;
    address: any;
  };

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

/**
 * Payroll response for different role interfaces
 */
export class PayrollRoleResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  payrollRunId: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  itemType: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false, description: 'Amount (Admin/HR only)' })
  amount?: string;

  @ApiProperty({ required: false })
  calculationData?: any;

  // Employee basic info
  @ApiProperty({ required: false })
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}