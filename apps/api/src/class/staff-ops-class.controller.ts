import {
  Body,
  Controller,
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
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  CreateStaffOpsClassDto,
  UpdateClassScheduleDto,
} from 'src/dtos/class.dto';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { ClassService } from './class.service';

@Controller('staff-ops/classes')
@ApiTags('staff-ops-classes')
@ApiCookieAuth('access_token')
@Roles(UserRole.staff, UserRole.admin)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StaffOpsClassController {
  constructor(private readonly classService: ClassService) { }

  @Get()
  @ApiOperation({
    summary: 'List classes for staff operations',
    description:
      'List classes for staff operations UI. Finance and student/teacher mutations remain unavailable from this route family.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['running', 'ended'] })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['vip', 'basic', 'advance', 'hardcore'],
  })
  @ApiResponse({ status: 200, description: 'Paginated class list.' })
  async getClasses(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.classService.getClassesForStaff(user.id, user.roleType, {
      ...query,
      search,
      status,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get class detail for staff operations',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiResponse({ status: 200, description: 'Class detail.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async getClassById(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.classService.getClassByIdForStaff(user.id, user.roleType, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create class with minimal metadata',
    description:
      'Create a new class for staff operations. Only minimal class metadata is accepted.',
  })
  @ApiBody({ type: CreateStaffOpsClassDto })
  @ApiResponse({ status: 201, description: 'Class created.' })
  async createClass(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStaffOpsClassDto,
  ) {
    return this.classService.createClassForStaff(user.id, user.roleType, dto);
  }

  @Patch(':id/schedule')
  @ApiOperation({
    summary: 'Update class schedule for staff operations',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiBody({ type: UpdateClassScheduleDto })
  @ApiResponse({ status: 200, description: 'Class schedule updated.' })
  async updateClassSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClassScheduleDto,
  ) {
    return this.classService.updateClassScheduleForStaff(
      user.id,
      user.roleType,
      id,
      dto,
    );
  }
}
