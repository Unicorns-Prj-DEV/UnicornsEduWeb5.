import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { AllowAssistantOnAdminRoutes } from 'src/auth/decorators/allow-assistant-on-admin.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  type AdminDashboardTopupHistoryItemDto,
  type AdminDashboardStudentBalanceItemDto,
  type AdminDashboardDto,
  GetAdminDashboardQueryDto,
  GetAdminStudentBalanceDetailsQueryDto,
  GetAdminTopupHistoryQueryDto,
} from '../dtos/dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@ApiTags('dashboard')
@ApiCookieAuth('access_token')
@AllowAssistantOnAdminRoutes(false)
@Roles(UserRole.admin)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin dashboard aggregate',
    description:
      'Return authoritative admin dashboard data aggregated directly from database records.',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Month in 01-12 format. Defaults to current month.',
    example: '03',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: String,
    description: 'Year in YYYY format. Defaults to current year.',
    example: '2026',
  })
  @ApiQuery({
    name: 'alertLimit',
    required: false,
    type: Number,
    description: 'Maximum number of rows returned for each alert group.',
    example: 6,
  })
  @ApiQuery({
    name: 'topClassLimit',
    required: false,
    type: Number,
    description: 'Maximum number of classes returned in the top classes table.',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard aggregate.',
  })
  async getAdminDashboard(
    @Query() query: GetAdminDashboardQueryDto,
  ): Promise<AdminDashboardDto> {
    return this.dashboardService.getAdminDashboard(query);
  }

  @Get('topup-history')
  @ApiOperation({
    summary: 'Get topup history in selected month',
    description:
      'Return wallet topup rows and cumulative totals for the selected period.',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Month in 01-12 format. Defaults to current month.',
    example: '03',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: String,
    description: 'Year in YYYY format. Defaults to current year.',
    example: '2026',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of rows returned.',
    example: 120,
  })
  @ApiResponse({
    status: 200,
    description: 'Topup history rows in selected period.',
  })
  async getAdminTopupHistory(
    @Query() query: GetAdminTopupHistoryQueryDto,
  ): Promise<AdminDashboardTopupHistoryItemDto[]> {
    return this.dashboardService.getAdminTopupHistory(query);
  }

  @Get('student-balance-details')
  @ApiOperation({
    summary: 'Get student balance detail rows',
    description:
      'Return active students and class labels with current account balance for dashboard detail popup.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of rows returned.',
    example: 200,
  })
  @ApiResponse({
    status: 200,
    description: 'Student balance detail rows.',
  })
  async getAdminStudentBalanceDetails(
    @Query() query: GetAdminStudentBalanceDetailsQueryDto,
  ): Promise<AdminDashboardStudentBalanceItemDto[]> {
    return this.dashboardService.getAdminStudentBalanceDetails(query);
  }
}
