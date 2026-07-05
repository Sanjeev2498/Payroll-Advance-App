import { ApiProperty } from '@nestjs/swagger';

export class SkillBreakdownDto {
  @ApiProperty({ description: 'Skill name' })
  skill: string;

  @ApiProperty({ description: 'Available guards with this skill' })
  available: number;

  @ApiProperty({ description: 'Required guards with this skill' })
  required: number;
}

export class GuardAvailabilityDto {
  @ApiProperty({ description: 'Total number of guards' })
  totalGuards: number;

  @ApiProperty({ description: 'Guards available now' })
  availableNow: number;

  @ApiProperty({ description: 'Guards currently on duty' })
  onDuty: number;

  @ApiProperty({ description: 'Unavailable guards' })
  unavailable: number;

  @ApiProperty({ description: 'Guards on leave' })
  onLeave: number;

  @ApiProperty({ description: 'Unassigned guards' })
  unassigned: number;

  @ApiProperty({ description: 'Skills breakdown', type: [SkillBreakdownDto] })
  skillBreakdown: SkillBreakdownDto[];
}