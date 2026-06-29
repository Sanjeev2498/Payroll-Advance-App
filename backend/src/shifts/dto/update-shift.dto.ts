import { PartialType } from '@nestjs/swagger';
import { CreateShiftDto, ShiftStatus } from './create-shift.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsObject } from 'class-validator';

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  @ApiPropertyOptional({
    description: 'Shift status',
    enum: ShiftStatus,
  })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({
    description: 'Modification reason and details',
  })
  @IsOptional()
  @IsObject()
  modificationReason?: {
    reason: string;
    changedBy: string;
    timestamp: string;
    previousValues?: any;
  };
}