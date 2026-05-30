import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';
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

interface StudentItem {
  id: string;
  fullName: string;
}

type CalendarActorScope = {
  teacherId?: string;
  redactStudentFields?: boolean;
};

@Controller('calendar')
@ApiTags('calendar')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin, UserRole.staff)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly staffOperationsAccess: StaffOperationsAccessService,
  ) {}

  private async resolveCalendarActorScope(
    user: JwtPayload,
  ): Promise<CalendarActorScope> {
    if (user.roleType !== UserRole.staff) {
      return {};
    }

    const actor = await this.staffOperationsAccess.resolveCalendarActor(
      user.id,
      user.roleType,
    );

    if (actor.calendarAccessMode === 'training') {
      return { redactStudentFields: true };
    }

    return { teacherId: actor.id };
  }

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
  @ApiResponse({
    status: 403,
    description:
      'Staff không có role teacher hoặc training không được dùng filter calendar này.',
  })
  async getClasses(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ClassItem>> {
    const { page, limit } = pagination;
    const scope = await this.resolveCalendarActorScope(user);

    return this.calendarService.getClasses(
      page,
      limit,
      search,
      scope.teacherId,
    );
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
  @ApiQuery({
    name: 'search',
    description: 'Tìm giáo viên theo tên, email hoặc account handle',
    required: false,
    type: String,
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
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<TeacherItem>> {
    const { page, limit } = pagination;
    return this.calendarService.getTeachers(page, limit, search);
  }

  @Get('students')
  @ApiOperation({ summary: 'Lấy danh sách học sinh (cho dropdown filter)' })
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
    description: 'Tìm học sinh theo tên',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách học sinh',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              fullName: { type: 'string', example: 'Nguyễn Minh Anh' },
            },
          },
        },
        total: { type: 'number', example: 10 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Staff không có role teacher không được dùng filter học sinh calendar này.',
  })
  async getStudentsForFilter(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<StudentItem>> {
    const { page, limit } = pagination;
    const scope = await this.resolveCalendarActorScope(user);
    if (scope.redactStudentFields) {
      throw new ForbiddenException(
        'Đào Tạo không được dùng filter học sinh trên calendar.',
      );
    }

    return this.calendarService.getStudentsForCalendar(
      page,
      limit,
      search,
      scope.teacherId,
    );
  }

  @Get('staff/events')
  @ApiOperation({
    summary: 'Lấy lịch staff hiện tại (teacher hoặc Đào Tạo)',
  })
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
    description: 'Lọc theo class ID (UNICL-xxxxxxxxxx)',
    required: false,
    type: String,
    example: 'UNICL-b2c3d4e5f6',
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
  ): Promise<{
    success: boolean;
    data: ClassScheduleEventDto[];
    total: number;
  }> {
    const actor = await this.staffOperationsAccess.resolveCalendarActor(
      user.id,
      user.roleType,
    );
    if (actor.calendarAccessMode === 'training' && filters.studentId) {
      throw new ForbiddenException(
        'Đào Tạo không được lọc lịch theo học sinh.',
      );
    }

    const result = await this.calendarService.getStaffScheduleEvents(
      filters,
      actor.calendarAccessMode === 'teacher'
        ? { teacherId: actor.id }
        : { redactStudentFields: actor.calendarAccessMode === 'training' },
    );
    return result;
  }
}
