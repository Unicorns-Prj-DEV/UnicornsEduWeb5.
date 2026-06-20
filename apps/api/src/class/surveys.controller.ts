import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { AllowAssistantOnAdminRoutes } from 'src/auth/decorators/allow-assistant-on-admin.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  type AdminMissingSurveyClassListDto,
  type AdminSurveyRoundSummaryDto,
  SetSurveyRoundDto,
} from 'src/dtos/survey-round.dto';
import { SurveyRoundService } from './survey-round.service';

/**
 * Strict admin-only oversight of the global "current survey round" and the
 * running classes that have not reported it yet.
 */
@Controller('surveys')
@ApiTags('surveys')
@ApiCookieAuth('access_token')
@AllowAssistantOnAdminRoutes(false)
@Roles(UserRole.admin)
export class SurveysController {
  constructor(private readonly surveyRoundService: SurveyRoundService) {}

  @Get('round')
  @ApiOperation({
    summary: 'Get current survey round summary',
    description:
      'Return the global current survey round (N) plus reporting compliance counts across running classes.',
  })
  @ApiResponse({ status: 200, description: 'Survey round summary.' })
  async getRoundSummary(): Promise<AdminSurveyRoundSummaryDto> {
    return this.surveyRoundService.getRoundSummary();
  }

  @Get('missing-classes')
  @ApiOperation({
    summary: 'List running classes missing the current survey round',
    description:
      'Return paginated running classes that have no class survey with test_number = current round.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated missing-class rows.' })
  async getMissingClasses(
    @Query() query: PaginationQueryDto,
  ): Promise<AdminMissingSurveyClassListDto> {
    return this.surveyRoundService.getMissingClasses({
      page: query.page,
      limit: query.limit,
    });
  }

  @Patch('round')
  @ApiOperation({
    summary: 'Set the current survey round',
    description:
      'Set the global current survey round to a specific number (admin correction).',
  })
  @ApiBody({ type: SetSurveyRoundDto })
  @ApiResponse({ status: 200, description: 'Updated survey round summary.' })
  async setRound(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetSurveyRoundDto,
  ): Promise<AdminSurveyRoundSummaryDto> {
    return this.surveyRoundService.setCurrentRound(dto.number, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
