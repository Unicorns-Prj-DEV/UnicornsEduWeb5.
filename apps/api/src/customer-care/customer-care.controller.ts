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
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import type {
  CustomerCareCommissionDto,
  CustomerCareSessionCommissionDto,
  CustomerCareStudentListDto,
  CustomerCareTopUpHistoryListDto,
} from 'src/dtos/customer-care.dto';
import { CustomerCareService } from './customer-care.service';

@ApiTags('customer-care')
@Controller('customer-care')
@ApiCookieAuth('access_token')
@Roles(UserRole.staff, UserRole.admin)
export class CustomerCareController {
  constructor(private readonly customerCareService: CustomerCareService) {}

  @Get('staff/:staffId/students')
  @ApiOperation({
    summary: 'List students in customer care',
    description:
      'Students assigned to this staff in customer_care_service, sorted by balance ascending.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default 1).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default 20, max 100).',
  })
  @ApiResponse({ status: 200, description: 'List of students.' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async getStudentsByStaffId(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CustomerCareStudentListDto> {
    return this.customerCareService.getStudentsByStaffId(
      user.id,
      user.roleType,
      staffId,
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    );
  }

  @Get('staff/:staffId/topup-history')
  @ApiOperation({
    summary: 'List top-up history for students in customer care',
    description:
      'Wallet top-up transactions for students assigned to this customer-care staff, sorted newest first.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default 1).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default 20, max 100).',
  })
  @ApiResponse({ status: 200, description: 'Paginated top-up history.' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async getTopUpHistoryByStaffId(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CustomerCareTopUpHistoryListDto> {
    return this.customerCareService.getTopUpHistoryByStaffId(
      user.id,
      user.roleType,
      staffId,
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    );
  }

  @Get('staff/:staffId/commissions')
  @ApiOperation({
    summary: 'List students with total commission',
    description:
      'Students with commission from attendances in the last N days.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Last N days (default 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of studentId, fullName, totalCommission.',
  })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async getCommissionsByStaffId(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Query('days') days?: string,
  ): Promise<CustomerCareCommissionDto[]> {
    const parsed = days ? parseInt(days, 10) : 30;
    const safeDays =
      Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 365) : 30;
    return this.customerCareService.getCommissionsByStaffId(
      user.id,
      user.roleType,
      staffId,
      safeDays,
    );
  }

  @Get('staff/:staffId/students/:studentId/session-commissions')
  @ApiOperation({
    summary: 'Session-level commissions for one student',
    description:
      'Attendances (sessions) in the last N days with commission per session.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Last N days (default 30)',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of session commission rows, including customer-care payment status.',
  })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async getSessionCommissionsByStudent(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Query('days') days?: string,
  ): Promise<CustomerCareSessionCommissionDto[]> {
    const parsed = days ? parseInt(days, 10) : 30;
    const safeDays =
      Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 365) : 30;
    return this.customerCareService.getSessionCommissionsByStudent(
      user.id,
      user.roleType,
      staffId,
      studentId,
      safeDays,
    );
  }
}
