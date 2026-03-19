import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  type SessionUnpaidSummaryItem,
  type SessionCreateDto,
  type SessionUpdateDto,
} from 'src/dtos/session.dto';
import { SessionService } from './session.service';

@Controller('sessions')
@ApiTags('sessions')
@ApiCookieAuth('access_token')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Tạo session' })
  @ApiBody({ type: Object, description: 'Session create payload' })
  @ApiResponse({ status: 201, description: 'Session đã được tạo.' })
  @ApiResponse({ status: 400, description: 'Lỗi khi tạo session.' })
  async createSession(@Body() data: SessionCreateDto) {
    return this.sessionService.createSession(data);
  }

  @Put(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Cập nhật session' })
  @ApiParam({ name: 'id', description: 'ID session' })
  @ApiBody({ type: Object, description: 'Session update payload' })
  @ApiResponse({ status: 200, description: 'Session đã được cập nhật.' })
  @ApiResponse({ status: 400, description: 'Lỗi khi cập nhật session.' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại.' })
  async updateSession(@Param('id') id: string, @Body() data: SessionUpdateDto) {
    return this.sessionService.updateSession({ ...data, id });
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Xóa session' })
  @ApiParam({ name: 'id', description: 'ID session' })
  @ApiResponse({ status: 200, description: 'Session đã được xóa.' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại.' })
  async deleteSession(@Param('id') id: string) {
    return this.sessionService.deleteSession(id);
  }

  @Get('/staff/:staffId/unpaid')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary:
      'Lấy tổng phụ cấp session chưa nhận theo staff trong N ngày gần nhất',
  })
  @ApiParam({ name: 'staffId', description: 'ID staff' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Số ngày gần nhất cần tổng hợp. Mặc định 14 ngày.',
    example: 14,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tổng phụ cấp chưa nhận theo lớp.',
    type: Object,
    isArray: true,
  })
  @ApiResponse({
    status: 400,
    description: 'days phải là số nguyên dương nếu được truyền vào.',
  })
  async getUnpaidSessionsByTeacherId(
    @Param('staffId') teacherId: string,
    @Query('days') days?: string,
  ): Promise<SessionUnpaidSummaryItem[]> {
    if (days == null) {
      return this.sessionService.getUnpaidSessionsByTeacherId(teacherId);
    }

    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1) {
      throw new BadRequestException('days must be a positive integer.');
    }

    return this.sessionService.getUnpaidSessionsByTeacherId(
      teacherId,
      parsedDays,
    );
  }

  @Get('/staff/:staffId')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Lấy session theo staff + tháng/năm' })
  @ApiParam({ name: 'staffId', description: 'ID staff' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (01-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (YYYY)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách session của staff trong tháng.',
  })
  @ApiResponse({ status: 400, description: 'month/year không hợp lệ.' })
  async getSessionsByTeacherId(
    @Param('staffId') teacherId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.sessionService.getSessionsByTeacherId(teacherId, month, year);
  }

  @Get('/class/:classId')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Lấy session theo class + tháng/năm' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (01-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (YYYY)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách session của lớp trong tháng.',
  })
  @ApiResponse({ status: 400, description: 'month/year không hợp lệ.' })
  async getSessionsByClassId(
    @Param('classId') classId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.sessionService.getSessionsByClassId(classId, month, year);
  }
}
