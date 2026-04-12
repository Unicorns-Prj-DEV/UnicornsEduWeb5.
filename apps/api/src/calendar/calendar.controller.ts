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
  constructor(private readonly calendarService: CalendarService) {}

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
}
