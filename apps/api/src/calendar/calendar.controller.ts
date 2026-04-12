import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { CurrentUser, type JwtPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CalendarService, type PaginatedResponse } from './calendar.service';
import { PaginationQueryDto } from '../dtos/pagination.dto';
import {
  ClassScheduleEventDto,
  ClassScheduleFilterDto,
} from '../dtos/class-schedule.dto';
import { StaffOperationsAccessService } from '../staff-ops/staff-operations-access.service';

interface ClassItem {
  id: string;
  name: string;
}

interface TeacherItem {
  id: string;
  name: string;
}

@Controller('calendar')
@ApiTags('calendar')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin, UserRole.staff)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly staffOperationsAccess: StaffOperationsAccessService,
  ) {}

  @Get('classes')
  @ApiOperation({ summary: 'Lấy danh sách lớp học (cho dropdown filter)' })
  @ApiQuery({
    name: 'page',
    description: 'Số trang',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số item mỗi trang',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'search',
    description: 'Tìm lớp theo tên (contains, không phân biệt hoa thường)',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách lớp học',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              name: { type: 'string', example: 'Lớp Toán 10A' },
            },
          },
        },
        total: { type: 'number', example: 10 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
      },
    },
  })
  async getClasses(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ClassItem>> {
    const { page, limit } = pagination;
    return this.calendarService.getClasses(page, limit, search);
  }

  @Get('teachers')
  @ApiOperation({ summary: 'Lấy danh sách giáo viên (cho dropdown filter)' })
  @ApiQuery({
    name: 'page',
    description: 'Số trang',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số item mỗi trang',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách giáo viên',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              name: { type: 'string', example: 'Nguyễn Văn An' },
            },
          },
        },
        total: { type: 'number', example: 10 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
      },
    },
  })
  async getTeachers(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeacherItem>> {
    const { page, limit } = pagination;
    return this.calendarService.getTeachers(page, limit);
  }

  @Get('staff/events')
  @ApiOperation({ summary: 'Lấy lịch dạy của staff hiện tại (teacher role)' })
  @ApiQuery({
    name: 'startDate',
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    required: true,
    example: '2026-04-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    required: true,
    example: '2026-04-30',
  })
  @ApiQuery({
    name: 'classId',
    description: 'Lọc theo class ID (UUID)',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách lịch dạy của staff',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ClassScheduleEventDto' },
        },
        total: { type: 'number', example: 8 },
      },
    },
  })
  async getStaffEvents(
    @CurrentUser() user: JwtPayload,
    @Query() filters: ClassScheduleFilterDto,
  ): Promise<{ success: boolean; data: ClassScheduleEventDto[]; total: number }> {
    const actor = await this.staffOperationsAccess.resolveActor(user.id, user.roleType);
    const result = await this.calendarService.getStaffScheduleEvents(actor.id, filters);
    return result;
  }
}
