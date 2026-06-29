import {
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
  IsEnum,
  ValidateNested,
  IsLatitude,
  IsLongitude,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDataDto {
  @ApiProperty({ description: 'GPS latitude coordinate' })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'GPS longitude coordinate' })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ description: 'Location accuracy in meters' })
  @IsOptional()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Address or location name' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Timestamp when location was captured' })
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @ApiPropertyOptional({ description: 'Method used to capture location (GPS, Network, Manual)' })
  @IsOptional()
  @IsString()
  method?: string;
}

export class VerificationDataDto {
  @ApiPropertyOptional({ description: 'Photo capture URL or base64 data' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ description: 'Biometric verification data' })
  @IsOptional()
  @IsObject()
  biometric?: any;

  @ApiPropertyOptional({ description: 'Device information used for verification' })
  @IsOptional()
  @IsObject()
  device?: {
    id?: string;
    model?: string;
    os?: string;
    appVersion?: string;
  };

  @ApiPropertyOptional({ description: 'IP address of the client' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Additional verification flags' })
  @IsOptional()
  @IsObject()
  flags?: {
    photoVerified?: boolean;
    locationVerified?: boolean;
    biometricVerified?: boolean;
    manualEntry?: boolean;
  };
}

export class CreateAttendanceDto {
  @ApiProperty({ 
    description: 'Employee ID for the attendance record',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  employeeId: string;

  @ApiProperty({ 
    description: 'Shift ID for the attendance record',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsString()
  shiftId: string;

  @ApiPropertyOptional({ 
    description: 'Clock-in timestamp (ISO 8601 format)',
    example: '2024-01-15T08:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @ApiPropertyOptional({ 
    description: 'Clock-out timestamp (ISO 8601 format)',
    example: '2024-01-15T17:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @ApiPropertyOptional({ 
    description: 'Location data for verification',
    type: LocationDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDataDto)
  locationData?: LocationDataDto;

  @ApiPropertyOptional({ 
    description: 'Verification data (photos, biometric, device info)',
    type: VerificationDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VerificationDataDto)
  verificationData?: VerificationDataDto;

  @ApiPropertyOptional({ 
    description: 'Additional notes for the attendance record',
    example: 'Employee arrived 10 minutes early due to traffic'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClockInDto {
  @ApiProperty({ 
    description: 'Employee ID for clock-in',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  employeeId: string;

  @ApiProperty({ 
    description: 'Shift ID for clock-in',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsString()
  shiftId: string;

  @ApiPropertyOptional({ 
    description: 'Override clock-in timestamp (admin only)',
    example: '2024-01-15T08:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  clockInTime?: string;

  @ApiProperty({ 
    description: 'Location data for verification',
    type: LocationDataDto
  })
  @ValidateNested()
  @Type(() => LocationDataDto)
  locationData: LocationDataDto;

  @ApiPropertyOptional({ 
    description: 'Verification data (photos, biometric, device info)',
    type: VerificationDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VerificationDataDto)
  verificationData?: VerificationDataDto;

  @ApiPropertyOptional({ 
    description: 'Notes for the clock-in',
    example: 'Early arrival due to traffic conditions'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClockOutDto {
  @ApiProperty({ 
    description: 'Employee ID for clock-out',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  employeeId: string;

  @ApiProperty({ 
    description: 'Shift ID for clock-out',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsString()
  shiftId: string;

  @ApiPropertyOptional({ 
    description: 'Override clock-out timestamp (admin only)',
    example: '2024-01-15T17:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  clockOutTime?: string;

  @ApiProperty({ 
    description: 'Location data for verification',
    type: LocationDataDto
  })
  @ValidateNested()
  @Type(() => LocationDataDto)
  locationData: LocationDataDto;

  @ApiPropertyOptional({ 
    description: 'Verification data (photos, biometric, device info)',
    type: VerificationDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VerificationDataDto)
  verificationData?: VerificationDataDto;

  @ApiPropertyOptional({ 
    description: 'Notes for the clock-out',
    example: 'Completed shift tasks successfully'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AttendanceCorrectionDto {
  @ApiProperty({ 
    description: 'Type of correction needed',
    enum: ['CLOCK_IN', 'CLOCK_OUT', 'BOTH', 'STATUS', 'LOCATION'],
    example: 'CLOCK_IN'
  })
  @IsEnum(['CLOCK_IN', 'CLOCK_OUT', 'BOTH', 'STATUS', 'LOCATION'])
  correctionType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BOTH' | 'STATUS' | 'LOCATION';

  @ApiProperty({ 
    description: 'Reason for the correction request',
    example: 'Employee forgot to clock in due to emergency situation'
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ 
    description: 'Corrected clock-in timestamp',
    example: '2024-01-15T08:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  correctedClockIn?: string;

  @ApiPropertyOptional({ 
    description: 'Corrected clock-out timestamp',
    example: '2024-01-15T17:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  correctedClockOut?: string;

  @ApiPropertyOptional({ 
    description: 'Corrected location data',
    type: LocationDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDataDto)
  correctedLocationData?: LocationDataDto;

  @ApiPropertyOptional({ 
    description: 'Supporting evidence for the correction',
    example: ['manager_approval_email.pdf', 'security_footage_timestamp.jpg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportingEvidence?: string[];

  @ApiPropertyOptional({ 
    description: 'Manager or supervisor approval ID',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ 
    description: 'Emergency override flag (for urgent corrections)',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  emergencyOverride?: boolean;
}