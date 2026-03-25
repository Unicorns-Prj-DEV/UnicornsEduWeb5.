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
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  type AdminDashboardDto,
  GetAdminDashboardQueryDto,
} from '../dtos/dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@ApiTags('dashboard')
@ApiCookieAuth('access_token')
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
}
