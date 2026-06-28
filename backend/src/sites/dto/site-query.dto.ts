import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SiteOperationalStatus } from './create-site.dto';

export class SiteQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for site name or address',
    example: 'downtown office',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by client ID',
    example: 'uuid-v4-string',
  })
  @IsOptional()
  @IsUUID(4)
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by operational status',
    enum: SiteOperationalStatus,
  })
  @IsOptional()
  @IsEnum(SiteOperationalStatus)
  operationalStatus?: SiteOperationalStatus;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'name',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({
    description: 'Filter sites with assignments',
    example: 'true',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasAssignments?: boolean;

  @ApiPropertyOptional({
    description: 'Filter sites requiring specific skills',
    example: 'security,first-aid',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'Filter by city name',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by state/province',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum hourly rate',
    example: '25.00',
  })
  @IsOptional()
  @Type(() => Number)
  minHourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum hourly rate',
    example: '50.00',
  })
  @IsOptional()
  @Type(() => Number)
  maxHourlyRate?: number;
}
