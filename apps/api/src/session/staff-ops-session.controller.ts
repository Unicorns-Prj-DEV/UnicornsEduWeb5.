import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ParseClassIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
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
  CreateStaffOpsSessionDto,
  UpdateStaffOpsSessionDto,
} from 'src/dtos/session.dto';
import { SessionService } from './session.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Controller('staff-ops')
@ApiTags('staff-ops-sessions')
@ApiCookieAuth('access_token')
@Roles(UserRole.staff, UserRole.admin)
export class StaffOpsSessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('classes/:classId/sessions')
  @ApiOperation({
    summary: 'Get class sessions for staff operations',
  })
  @ApiParam({ name: 'classId', description: 'Class id' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (01-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (YYYY)' })
  @ApiResponse({
    status: 200,
    description: 'Class sessions in selected month.',
  })
  async getSessionsByClassId(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.sessionService.getSessionsByClassIdForStaff(
      user.id,
      user.roleType,
      classId,
      month,
      year,
    );
  }

  @Post('classes/:classId/sessions')
  @ApiOperation({
    summary: 'Create class session for staff operations',
    description:
      'Creates a session allowing date/time/notes/attendance and coefficient only. Teacher, allowance and tuition overrides are not accepted.',
  })
  @ApiParam({ name: 'classId', description: 'Class id' })
  @ApiBody({ type: CreateStaffOpsSessionDto })
  @ApiResponse({ status: 201, description: 'Session created.' })
  async createSession(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Body() dto: CreateStaffOpsSessionDto,
  ) {
    return this.sessionService.createSessionForStaff(
      user.id,
      user.roleType,
      classId,
      dto,
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
    );
  }

  @Put('sessions/:id')
  @ApiOperation({
    summary: 'Update class session for staff operations',
    description:
      'Updates session date/time/notes/attendance and coefficient only. Teacher, allowance and tuition fields are not accepted.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiBody({ type: UpdateStaffOpsSessionDto })
  @ApiResponse({ status: 200, description: 'Session updated.' })
  async updateSession(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStaffOpsSessionDto,
  ) {
    return this.sessionService.updateSessionForStaff(
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
}
