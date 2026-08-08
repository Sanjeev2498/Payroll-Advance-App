import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsEnum, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsUUID, 
  IsBoolean, 
  MaxLength, 
  MinLength 
} from 'class-validator';
import { ClientUserRole } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateClientUserDto {
  @ApiProperty({
    description: 'Client ID that this user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'Client ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Client ID is required' })
  clientId: string;

  @ApiProperty({
    description: 'Client user email address',
    example: 'security.manager@clientcompany.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'First name of the client user',
    example: 'John',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the client user',
    example: 'Smith',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName: string;

  @ApiProperty({
    description: 'Role of the client user',
    enum: ClientUserRole,
    example: ClientUserRole.SECURITY_MANAGER,
  })
  @IsEnum(ClientUserRole, { message: 'Role must be a valid client user role' })
  @IsNotEmpty({ message: 'Role is required' })
  role: ClientUserRole;

  @ApiPropertyOptional({
    description: 'Phone number of the client user',
    example: '+1-555-0123',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone cannot exceed 20 characters' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Job title of the client user',
    example: 'Security Operations Manager',
  })
  @IsOptional()
  @IsString({ message: 'Job title must be a string' })
  @MaxLength(100, { message: 'Job title cannot exceed 100 characters' })
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'Department of the client user',
    example: 'Security',
  })
  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  @MaxLength(100, { message: 'Department cannot exceed 100 characters' })
  department?: string;
}

export class UpdateClientUserDto {
  @ApiPropertyOptional({
    description: 'Client user email address',
    example: 'security.manager@clientcompany.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email?: string;

  @ApiPropertyOptional({
    description: 'First name of the client user',
    example: 'John',
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the client user',
    example: 'Smith',
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Role of the client user',
    enum: ClientUserRole,
    example: ClientUserRole.SECURITY_MANAGER,
  })
  @IsOptional()
  @IsEnum(ClientUserRole, { message: 'Role must be a valid client user role' })
  role?: ClientUserRole;

  @ApiPropertyOptional({
    description: 'Phone number of the client user',
    example: '+1-555-0123',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone cannot exceed 20 characters' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Job title of the client user',
    example: 'Security Operations Manager',
  })
  @IsOptional()
  @IsString({ message: 'Job title must be a string' })
  @MaxLength(100, { message: 'Job title cannot exceed 100 characters' })
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'Department of the client user',
    example: 'Security',
  })
  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  @MaxLength(100, { message: 'Department cannot exceed 100 characters' })
  department?: string;

  @ApiPropertyOptional({
    description: 'Whether the user is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

export class ClientUserQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Client ID must be a valid UUID' })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by role',
    enum: ClientUserRole,
    example: ClientUserRole.SECURITY_MANAGER,
  })
  @IsOptional()
  @IsEnum(ClientUserRole, { message: 'Role must be a valid client user role' })
  role?: ClientUserRole;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search by name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @MaxLength(100, { message: 'Search cannot exceed 100 characters' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'sortBy must be a string' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: 'sortOrder must be a string' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class BulkUpdateClientUsersDto {
  @ApiProperty({
    description: 'Array of client user IDs to update',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    type: [String],
  })
  @IsUUID(4, { each: true, message: 'Each user ID must be a valid UUID' })
  @IsNotEmpty({ message: 'User IDs are required' })
  userIds: string[];

  @ApiProperty({
    description: 'Updates to apply to all selected users',
    type: UpdateClientUserDto,
  })
  updates: UpdateClientUserDto;
}