import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
  CreateStaffOpsSessionDto,
  UpdateStaffOpsSessionDto,
} from 'src/dtos/session.dto';
import { SessionService } from './session.service';

@Controller('staff-ops')
@ApiTags('staff-ops-sessions')
@ApiCookieAuth('access_token')
@Roles(UserRole.staff, UserRole.admin)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StaffOpsSessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('classes/:classId/sessions')
  @ApiOperation({
    summary: 'Get class sessions for staff operations',
  })
  @ApiParam({ name: 'classId', description: 'Class id' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (01-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (YYYY)' })
  @ApiResponse({ status: 200, description: 'Class sessions in selected month.' })
  async getSessionsByClassId(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseUUIDPipe()) classId: string,
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
      'Creates a session without allowing teacher or financial overrides from staff UI.',
  })
  @ApiParam({ name: 'classId', description: 'Class id' })
  @ApiBody({ type: CreateStaffOpsSessionDto })
  @ApiResponse({ status: 201, description: 'Session created.' })
  async createSession(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseUUIDPipe()) classId: string,
    @Body() dto: CreateStaffOpsSessionDto,
  ) {
    return this.sessionService.createSessionForStaff(
      user.id,
      user.roleType,
      classId,
      dto,
    );
  }

  @Put('sessions/:id')
  @ApiOperation({
    summary: 'Update class session for staff operations',
    description:
      'Updates session date/time/notes/attendance only. Financial and teacher fields are not accepted.',
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
    );
  }
}
