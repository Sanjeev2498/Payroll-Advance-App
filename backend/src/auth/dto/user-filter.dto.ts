import { IsOptional, IsEnum, IsBoolean, IsInt, Min, Max, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserFilterDto {
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string; // Search by name or email

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: 'firstName' | 'lastName' | 'email' | 'role' | 'createdAt' | 'lastLoginAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be asc or desc' })
  sortOrder?: 'asc' | 'desc' = 'asc';
}
