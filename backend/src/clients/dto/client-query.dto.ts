import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumberString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from './create-client.dto';

export class ClientQueryDto {
  @ApiPropertyOptional({ 
    description: 'Search term for client name or email',
    example: 'Acme'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by contract status',
    enum: ContractStatus
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  contractStatus?: ContractStatus;

  @ApiPropertyOptional({ 
    description: 'Find contracts expiring before this date',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : null)
  contractExpiringBefore?: Date;

  @ApiPropertyOptional({ 
    description: 'Page number for pagination',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? parseInt(value, 10) : 1)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ 
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? parseInt(value, 10) : 20)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    description: 'Field to sort by',
    example: 'name'
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'contactEmail' | 'contractStatus' | 'contractStart' | 'contractEnd' | 'createdAt';

  @ApiPropertyOptional({ 
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}