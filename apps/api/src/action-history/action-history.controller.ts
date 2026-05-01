import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActionHistoryQueryDto } from '../dtos/action-history.dto';
import { ActionHistoryQueryService } from './action-history-query.service';

@Controller('action-history')
@ApiTags('action-history')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class ActionHistoryController {
  constructor(
    private readonly actionHistoryQueryService: ActionHistoryQueryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List action history',
    description:
      'Get paginated audit history with indexed filters for entity, action, actor, and date range.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    type: String,
    description: 'Exact entity type filter.',
  })
  @ApiQuery({
    name: 'actionType',
    required: false,
    enum: ['create', 'update', 'delete'],
    description: 'Exact action type filter.',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    type: String,
    description: 'Exact entity id filter.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Exact actor user id filter.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter from date (inclusive), YYYY-MM-DD.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter to date (inclusive), YYYY-MM-DD.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated action history summary list.',
  })
  async getActionHistories(@Query() query: ActionHistoryQueryDto) {
    return this.actionHistoryQueryService.getActionHistories(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get action history by id',
    description:
      'Get a single action history entry with full before/after snapshots.',
  })
  @ApiParam({ name: 'id', description: 'Action history id' })
  @ApiResponse({ status: 200, description: 'Action history found.' })
  @ApiResponse({ status: 404, description: 'Action history not found.' })
  async getActionHistoryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.actionHistoryQueryService.getActionHistoryById(id);
  }
}
