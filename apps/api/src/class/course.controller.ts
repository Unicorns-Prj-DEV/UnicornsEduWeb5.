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
import { StaffRole, UserRole } from 'generated/enums';
import { AllowStaffRolesOnAdminRoutes } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateCourseDto, UpdateCourseDto } from 'src/dtos/class.dto';
import { CourseService } from './course.service';

@Controller('courses')
@ApiTags('courses')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin, UserRole.staff)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @ApiOperation({
    summary: 'List courses',
    description:
      'Danh sách khoá học (VIP, Basic, Advance, Hardcore, THPT Basic, ...). Dùng cho dropdown chọn khoá học khi tạo/sửa lớp.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Include deactivated courses (admin only).',
  })
  @ApiResponse({ status: 200, description: 'List of courses.' })
  async list(@Query('includeInactive') includeInactive?: string) {
    return this.courseService.list(includeInactive === 'true');
  }

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ status: 201, description: 'Course created.' })
  async create(@Body() dto: CreateCourseDto) {
    return this.courseService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', description: 'Course id' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({ status: 200, description: 'Course updated.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courseService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({
    summary: 'Delete a course',
    description:
      'Chỉ xoá được khi không còn lớp nào dùng khoá học này. Nếu muốn ẩn tạm thời, dùng PATCH với is_active=false.',
  })
  @ApiParam({ name: 'id', description: 'Course id' })
  @ApiResponse({ status: 200, description: 'Course deleted.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.remove(id);
  }
}
