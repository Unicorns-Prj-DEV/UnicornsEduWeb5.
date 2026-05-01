import {
  ForbiddenException,
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
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  CreateStaffOpsClassDto,
  UpdateClassScheduleDto,
} from 'src/dtos/class.dto';
import {
  ClassScheduleFilterDto,
  CreateClassScopedMakeupScheduleEventDto,
  MakeupScheduleEventDto,
  UpdateClassScopedMakeupScheduleEventDto,
} from 'src/dtos/class-schedule.dto';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CalendarService } from 'src/calendar/calendar.service';
import { StaffOperationsAccessService } from 'src/staff-ops/staff-operations-access.service';
import { ClassService } from './class.service';

@Controller('staff-ops/classes')
@ApiTags('staff-ops-classes')
@ApiCookieAuth('access_token')
@Roles(UserRole.staff, UserRole.admin)
export class StaffOpsClassController {
  constructor(
    private readonly classService: ClassService,
    private readonly calendarService: CalendarService,
    private readonly staffOperationsAccess: StaffOperationsAccessService,
  ) {}

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

  @Get(':id/makeup-events')
  @ApiOperation({
    summary: 'List class makeup events for staff operations',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Makeup events for the selected class.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/MakeupScheduleEventDto' },
        },
        total: { type: 'number', example: 2 },
      },
    },
  })
  async listMakeupEventsByClassId(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() filters: ClassScheduleFilterDto,
  ): Promise<{
    success: boolean;
    data: MakeupScheduleEventDto[];
    total: number;
  }> {
    const actor = await this.staffOperationsAccess.resolveClassViewerActor(
      user.id,
      user.roleType,
    );
    await this.staffOperationsAccess.resolveClassViewAccessMode(actor, id);
    return this.calendarService.listMakeupScheduleEventsForClass(id, filters);
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
    return this.classService.createClassForStaff(user.id, user.roleType, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post(':id/makeup-events')
  @ApiOperation({
    summary: 'Create class makeup event for staff operations',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiBody({ type: CreateClassScopedMakeupScheduleEventDto })
  @ApiResponse({ status: 201, description: 'Makeup event created.' })
  async createMakeupEventByClassId(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateClassScopedMakeupScheduleEventDto,
  ): Promise<{ success: boolean; data: MakeupScheduleEventDto }> {
    const actor = await this.staffOperationsAccess.resolveActor(
      user.id,
      user.roleType,
    );

    if (actor.roles.includes(StaffRole.teacher)) {
      await this.staffOperationsAccess.assertTeacherAssignedToClass(
        actor.id,
        id,
      );
      if (dto.teacherId !== actor.id) {
        throw new ForbiddenException(
          'Teacher chỉ được tạo buổi bù với chính mình là người phụ trách.',
        );
      }
    }

    return this.calendarService.createMakeupScheduleEventForClass(id, dto);
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
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
    );
  }

  @Patch(':id/makeup-events/:eventId')
  @ApiOperation({
    summary: 'Update class makeup event for staff operations',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiParam({ name: 'eventId', description: 'Makeup event id' })
  @ApiBody({ type: UpdateClassScopedMakeupScheduleEventDto })
  @ApiResponse({ status: 200, description: 'Makeup event updated.' })
  async updateMakeupEventByClassId(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: UpdateClassScopedMakeupScheduleEventDto,
  ): Promise<{ success: boolean; data: MakeupScheduleEventDto }> {
    if (user.roleType !== UserRole.admin) {
      throw new ForbiddenException(
        'Chỉ admin mới được chỉnh sửa buổi bù trong staff workspace.',
      );
    }

    return this.calendarService.updateMakeupScheduleEventForClass(
      id,
      eventId,
      dto,
    );
  }

  @Delete(':id/makeup-events/:eventId')
  @ApiOperation({
    summary: 'Delete class makeup event for staff operations',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiParam({ name: 'eventId', description: 'Makeup event id' })
  @ApiResponse({ status: 200, description: 'Makeup event deleted.' })
  async deleteMakeupEventByClassId(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ): Promise<{ success: boolean }> {
    if (user.roleType !== UserRole.admin) {
      throw new ForbiddenException(
        'Chỉ admin mới được xóa buổi bù trong staff workspace.',
      );
    }

    return this.calendarService.deleteMakeupScheduleEventForClass(id, eventId);
  }
}
