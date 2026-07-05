import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray, IsString, IsObject } from 'class-validator';

export class OptimizeDeploymentsDto {
  @ApiProperty({ description: 'Time horizon for optimization in hours' })
  @IsNumber()
  timeHorizon: number;

  @ApiProperty({ description: 'List of optimization priorities', type: [String] })
  @IsArray()
  @IsString({ each: true })
  priorities: string[];

  @ApiProperty({ description: 'Optimization constraints' })
  @IsObject()
  constraints: Record<string, any>;
}