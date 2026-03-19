import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  CreateStaffDto,
  type StaffIncomeSummaryDto,
  SearchAssignableStaffUsersDto,
  UpdateStaffDto,
} from 'src/dtos/staff.dto';
import { StaffService } from './staff.service';

@Controller('staff')
@ApiTags('staff')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('assignable-users')
  @ApiOperation({
    summary: 'Search users by email for tutor assignment',
    description:
      'Search existing users by email and return whether they can be linked to a new staff/tutor profile.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Full or partial email',
    example: 'teacher@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching users with eligibility metadata.',
  })
  async searchAssignableUsers(@Query() query: SearchAssignableStaffUsersDto) {
    return this.staffService.searchAssignableUsersByEmail(query.email);
  }

  @Get()
  @ApiOperation({
    summary: 'List staff',
    description: 'Get all staff records.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by full name',
    example: 'Nguyen',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive'],
    description: 'Filter by staff status',
  })
  @ApiQuery({
    name: 'classId',
    required: false,
    type: String,
    description: 'Filter by class ID',
    example: '7b9f53df-0f90-4e2b-8d52-60b8488f5d5f',
  })
  @ApiQuery({
    name: 'className',
    required: false,
    type: String,
    description: 'Filter by class name (contains, case-insensitive)',
    example: 'Toán 8A',
  })
  @ApiQuery({
    name: 'province',
    required: false,
    type: String,
    description: 'Filter by province (contains, case-insensitive)',
    example: 'ha noi',
  })
  @ApiQuery({
    name: 'university',
    required: false,
    type: String,
    description: 'Filter by university (contains, case-insensitive)',
    example: 'HCMUS',
  })
  @ApiQuery({
    name: 'highSchool',
    required: false,
    type: String,
    description: 'Filter by high school (contains, case-insensitive)',
    example: 'Lê Hồng Phong',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by staff role',
    example: 'teacher',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated staff list with data and meta.',
  })
  async getStaff(
    @Query() query: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('classId') classId?: string,
    @Query('className') className?: string,
    @Query('province') province?: string,
    @Query('university') university?: string,
    @Query('highSchool') highSchool?: string,
    @Query('role') role?: string,
  ) {
    return this.staffService.getStaff({
      ...query,
      search,
      status,
      classId,
      className,
      province,
      university,
      highSchool,
      role,
    });
  }

  @Get(':id/income-summary')
  @ApiOperation({
    summary: 'Get staff income summary',
    description:
      'Get backend-authoritative income summaries for a staff detail page.',
  })
  @ApiParam({ name: 'id', description: 'Staff id' })
  @ApiQuery({
    name: 'month',
    required: true,
    type: String,
    description: 'Month in 01-12 format',
    example: '03',
  })
  @ApiQuery({
    name: 'year',
    required: true,
    type: String,
    description: 'Year in YYYY format',
    example: '2026',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Recent unpaid window in days (default: 14)',
    example: 14,
  })
  @ApiResponse({
    status: 200,
    description: 'Staff income summary.',
  })
  @ApiResponse({ status: 400, description: 'month/year/days invalid.' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async getStaffIncomeSummary(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('days') days?: string,
  ): Promise<StaffIncomeSummaryDto> {
    const parsedDays =
      days == null || days.trim() === '' ? undefined : Number(days);

    return this.staffService.getIncomeSummary(id, {
      month,
      year,
      days: parsedDays,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get staff by id',
    description: 'Get a single staff record by id.',
  })
  @ApiParam({ name: 'id', description: 'Staff id' })
  @ApiResponse({ status: 200, description: 'Staff found.' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async getStaffById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.staffService.getStaffById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create staff',
    description: 'Create a new staff record.',
  })
  @ApiBody({ type: CreateStaffDto, description: 'Staff create payload' })
  @ApiResponse({ status: 201, description: 'Staff created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async createStaff(@Body() data: CreateStaffDto) {
    return this.staffService.createStaff(data);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update staff',
    description: 'Update a staff record.',
  })
  @ApiBody({
    type: UpdateStaffDto,
    description: 'Staff update payload (id required)',
  })
  @ApiResponse({ status: 200, description: 'Staff updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async updateStaff(@Body() data: UpdateStaffDto) {
    return this.staffService.updateStaff(data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete staff',
    description: 'Delete a staff record by id.',
  })
  @ApiParam({ name: 'id', description: 'Staff id' })
  @ApiResponse({ status: 200, description: 'Staff deleted.' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  async deleteStaff(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.staffService.deleteStaff(id);
  }
}
