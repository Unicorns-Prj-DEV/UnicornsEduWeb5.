import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { UserRole } from 'generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CalendarService, type CalendarEvent } from './calendar.service';
import {
  CalendarEventResponseDto,
  CalendarEventFilterDto,
  CalendarSessionUpdateDto,
  CalendarSyncPayload,
  ResyncResponseDto,
} from '../dtos/google-calendar.dto';
import {
  ClassScheduleEventDto,
  ClassScheduleFilterDto,
  ClassSchedulePatternDto,
} from '../dtos/class-schedule.dto';

@Controller('admin/calendar')
@ApiTags('calendar-admin')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class CalendarAdminController {
  constructor(private readonly calendarService: CalendarService) { }

  @Get('events')
  @ApiOperation({ summary: 'Lấy danh sách sự kiện lịch với bộ lọc' })
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
  @ApiQuery({
    name: 'teacherId',
    description: 'Lọc theo teacher ID (UUID)',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách sự kiện lịch',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CalendarEvent' },
        },
        total: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  async getAdminEvents(
    @Query() filters: CalendarEventFilterDto,
  ): Promise<{ success: boolean; data: CalendarEvent[]; total: number }> {
    const result = await this.calendarService.getAdminEvents(filters);
    return {
      success: true,
      data: result.data,
      total: result.total,
    };
  }

  @Get('class-schedule')
  @ApiOperation({
    summary: 'Lấy các occurrence của class schedule pattern trong khoảng ngày',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách class schedule occurrences',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ClassScheduleEventDto' },
        },
        total: { type: 'number', example: 8 },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 8 },
          },
        },
      },
    },
  })
  async getClassScheduleEvents(
    @Query() filters: ClassScheduleFilterDto,
  ): Promise<{
    success: boolean;
    data: ClassScheduleEventDto[];
    total: number;
    meta: { total: number };
  }> {
    const result = await this.calendarService.getClassScheduleEvents(filters);
    return {
      ...result,
      meta: { total: result.total },
    };
  }

  @Get('classes/:classId/schedule')
  @ApiOperation({ summary: 'Lấy weekly schedule pattern của một lớp' })
  @ApiParam({ name: 'classId', description: 'Class ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lịch học định kỳ của lớp',
    type: ClassSchedulePatternDto,
  })
  @ApiResponse({ status: 404, description: 'Class không tồn tại' })
  async getClassSchedulePattern(
    @Param('classId', new ParseUUIDPipe()) classId: string,
  ) {
    return this.calendarService.getClassSchedulePattern(classId);
  }

  @Put('classes/:classId/schedule')
  @ApiOperation({ summary: 'Cập nhật weekly schedule pattern của một lớp' })
  @ApiParam({ name: 'classId', description: 'Class ID (UUID)' })
  @ApiBody({
    description: 'Weekly schedule pattern payload',
    type: ClassSchedulePatternDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Lịch học định kỳ đã được cập nhật',
    type: ClassSchedulePatternDto,
  })
  @ApiResponse({ status: 404, description: 'Class không tồn tại' })
  async updateClassSchedulePattern(
    @Param('classId', new ParseUUIDPipe()) classId: string,
    @Body() dto: ClassSchedulePatternDto,
  ) {
    console.log(`[Calendar Admin PUT] Received PUT for class ${classId}, schedule entries: ${dto.schedule.length}`);
    console.log(`[Calendar Admin PUT] Entries: ${JSON.stringify(dto.schedule, null, 2)}`);
    const result = await this.calendarService.updateClassSchedulePattern(
      classId,
      dto.schedule,
    );
    console.log(`[Calendar Admin PUT] PUT completed for class ${classId}, result: ${JSON.stringify(result)}`);
    return result;
  }

  @Post('events')
  @ApiOperation({ summary: 'Tạo sự kiện lịch cho session (sync one session)' })
  @ApiBody({
    description: 'Session sync payload',
    type: CalendarSyncPayload,
  })
  @ApiResponse({
    status: 200,
    description: 'Sự kiện lịch đã được tạo',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/ResyncResponseDto' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async createCalendarEvent(
    @Body() dto: CalendarSyncPayload,
  ): Promise<{ success: boolean; data: ResyncResponseDto }> {
    return {
      success: true,
      data: await this.calendarService.syncEvent(dto.sessionId),
    };
  }

  @Get('events/:sessionId')
  @ApiOperation({ summary: 'Lấy thông tin sự kiện theo session ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin sự kiện lịch',
    type: CalendarEventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async getEventBySessionId(
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; data: CalendarEvent }> {
    const event = await this.calendarService.getEventBySessionId(sessionId);
    if (!event) {
      throw new BadRequestException(`Session not found: ${sessionId}`);
    }
    return { success: true, data: event };
  }

  @Put('events/:sessionId')
  @ApiOperation({ summary: 'Cập nhật session và đồng bộ lịch' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiBody({
    description: 'Session update payload',
    type: CalendarSessionUpdateDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Session đã được cập nhật và đồng bộ lịch',
    type: CalendarEventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async updateSessionAndSync(
    @Param('sessionId') sessionId: string,
    @Body() dto: CalendarSessionUpdateDto,
  ): Promise<CalendarEvent> {
    const updates: Partial<{
      date: Date;
      startTime: Date | null;
      endTime: Date | null;
      notes: string | null;
      classId: string;
      teacherId: string;
    }> = {};

    if (dto.date) {
      const [year, month, day] = dto.date.split('-').map(Number);
      updates.date = new Date(year, month - 1, day);
    }

    if (dto.startTime) {
      const [hours, minutes, seconds] = dto.startTime.split(':').map(Number);
      updates.startTime = new Date(0, 0, 0, hours, minutes, seconds ?? 0);
    }

    if (dto.endTime) {
      const [hours, minutes, seconds] = dto.endTime.split(':').map(Number);
      updates.endTime = new Date(0, 0, 0, hours, minutes, seconds ?? 0);
    }

    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.classId !== undefined) updates.classId = dto.classId;
    if (dto.teacherId !== undefined) updates.teacherId = dto.teacherId;

    return this.calendarService.updateSessionAndSync(sessionId, updates);
  }

  @Delete('events/:sessionId')
  @ApiOperation({ summary: 'Xóa session và sự kiện lịch Google' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Session đã được xóa' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async deleteSessionAndCalendar(
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean }> {
    await this.calendarService.deleteSessionAndCalendar(sessionId);
    return { success: true };
  }

  @Post('events/:sessionId/sync')
  @ApiOperation({ summary: 'Đồng bộ thủ công một session lên Google Calendar' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Kết quả đồng bộ',
    type: ResyncResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async syncEvent(
    @Param('sessionId') sessionId: string,
  ): Promise<ResyncResponseDto> {
    return this.calendarService.syncEvent(sessionId);
  }
}
