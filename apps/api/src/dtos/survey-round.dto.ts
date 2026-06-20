import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * Authoritative summary of the global "current survey round" (lần khảo sát hiện
 * tại) plus reporting compliance counts across running classes.
 */
export interface AdminSurveyRoundSummaryDto {
  currentRound: number;
  totalRunningClasses: number;
  reportedCount: number;
  missingCount: number;
}

/**
 * One running class that has not yet reported the current survey round.
 */
export interface AdminMissingSurveyClassDto {
  classId: string;
  name: string;
  teachers: string[];
  latestReportedRound: number | null;
  lastReportDate: string | null;
}

export interface AdminMissingSurveyClassListDto {
  data: AdminMissingSurveyClassDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export class SetSurveyRoundDto {
  @ApiProperty({
    description: 'Lần khảo sát hiện tại (số nguyên dương).',
    example: 6,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number!: number;
}
