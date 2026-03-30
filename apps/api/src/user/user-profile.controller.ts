import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BonusService } from 'src/bonus/bonus.service';
import { PaymentStatus } from 'generated/enums';
import { ExtraAllowanceService } from 'src/extra-allowance/extra-allowance.service';
import { LessonService } from 'src/lesson/lesson.service';
import {
  StudentWalletHistoryQueryDto,
  UpdateMyStudentAccountBalanceDto,
} from 'src/dtos/student.dto';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { CreateMyBonusDto, UpdateMyBonusDto } from 'src/dtos/bonus.dto';
import { CreateMyCommunicationExtraAllowanceDto } from 'src/dtos/extra-allowance.dto';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  UpdateMyProfileDto,
  UpdateMyStaffProfileDto,
  UpdateMyStudentProfileDto,
} from 'src/dtos/profile.dto';
import { SessionService } from 'src/session/session.service';
import { StaffService } from 'src/staff/staff.service';
import { StudentService } from 'src/student/student.service';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users/me')
@ApiCookieAuth('access_token')
export class UserProfileController {
  constructor(
    private readonly userService: UserService,
    private readonly staffService: StaffService,
    private readonly bonusService: BonusService,
    private readonly sessionService: SessionService,
    private readonly extraAllowanceService: ExtraAllowanceService,
    private readonly lessonService: LessonService,
    private readonly studentService: StudentService,
  ) {}

  @Get('full')
  @ApiOperation({
    summary: 'Get full profile',
    description:
      'Returns current user with staffInfo and studentInfo (if linked). Requires access_token cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Full profile (user + staff + student).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getFullProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.getFullProfile(user.id);
  }

  @Get('staff-detail')
  @ApiOperation({
    summary: 'Get current staff detail',
    description:
      'Returns the linked staff detail of the current authenticated user. Fails if user has no linked staff record.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current staff detail.',
  })
  @ApiResponse({ status: 400, description: 'User has no staff record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStaffDetail(@CurrentUser() user: JwtPayload) {
    const staffId = await this.userService.getLinkedStaffId(user.id);
    return this.staffService.getStaffById(staffId);
  }

  @Get('staff-income-summary')
  @ApiOperation({
    summary: 'Get current staff income summary',
    description:
      'Returns backend-authoritative income summary for the current linked staff profile.',
  })
  @ApiQuery({
    name: 'month',
    required: true,
    type: String,
    description: 'Month in 01-12 format',
    example: '03',
  })
  @ApiQuery({
    name: 'year',
    required: true,
    type: String,
    description: 'Year in YYYY format',
    example: '2026',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Recent unpaid window in days (default: 14)',
    example: 14,
  })
  @ApiResponse({
    status: 200,
    description: 'Current staff income summary.',
  })
  @ApiResponse({
    status: 400,
    description: 'month/year invalid or no staff record.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStaffIncomeSummary(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('days') days?: string,
  ) {
    const staffId = await this.userService.getLinkedStaffId(user.id);
    const parsedDays =
      days == null || days.trim() === '' ? undefined : Number(days);

    return this.staffService.getIncomeSummary(staffId, {
      month,
      year,
      days: parsedDays,
    });
  }

  @Get('staff-bonuses')
  @ApiOperation({
    summary: 'List current staff bonuses',
    description:
      'Returns paginated bonus records for the current linked staff profile.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Filter by month key (YYYY-MM)',
    example: '2026-03',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by payment status',
    example: 'pending',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated bonus list for current staff.',
  })
  @ApiResponse({ status: 400, description: 'User has no staff record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStaffBonuses(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
    @Query('month') month?: string,
    @Query('status') status?: string,
  ) {
    const staffId = await this.userService.getLinkedStaffId(user.id);

    return this.bonusService.getBonuses({
      ...query,
      staffId,
      month,
      status,
    });
  }

  @Post('staff-bonuses')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Create current staff bonus',
    description:
      'Creates a bonus record for the current linked staff profile. Self-service entries are always created with pending payment status.',
  })
  @ApiBody({ type: CreateMyBonusDto })
  @ApiResponse({
    status: 201,
    description: 'Bonus created for current staff with pending payment status.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no staff record.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createMyStaffBonus(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateMyBonusDto,
  ) {
    const staffId = await this.userService.getLinkedStaffId(user.id);

    return this.bonusService.createBonus(
      {
        ...body,
        staffId,
        status: PaymentStatus.pending,
      },
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
    );
  }

  @Patch('staff-bonuses')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Update current staff bonus',
    description:
      'Updates a bonus record belonging to the current linked staff profile. Self-service can edit work type, month, amount and note, but cannot change payment status.',
  })
  @ApiBody({ type: UpdateMyBonusDto })
  @ApiResponse({
    status: 200,
    description: 'Bonus updated for current staff.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no staff record.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Bonus not found for current staff.',
  })
  async updateMyStaffBonus(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyBonusDto,
  ) {
    const staffId = await this.userService.getLinkedStaffId(user.id);
    const bonus = await this.bonusService.getBonusOwnershipById(body.id);

    if (bonus.staffId !== staffId) {
      throw new NotFoundException('Bonus not found');
    }

    return this.bonusService.updateBonus(
      {
        id: body.id,
        workType: body.workType,
        month: body.month,
        amount: body.amount,
        note: body.note,
      },
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
    );
  }

  @Get('staff-sessions')
  @ApiOperation({
    summary: 'List current staff sessions by month/year',
    description:
      'Returns sessions for the current linked staff profile in a given month/year.',
  })
  @ApiQuery({
    name: 'month',
    required: true,
    type: String,
    description: 'Month in 01-12 format',
    example: '03',
  })
  @ApiQuery({
    name: 'year',
    required: true,
    type: String,
    description: 'Year in YYYY format',
    example: '2026',
  })
  @ApiResponse({
    status: 200,
    description: 'Session list for current staff in the selected month.',
  })
  @ApiResponse({
    status: 400,
    description: 'month/year invalid or no staff record.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStaffSessions(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const staffId = await this.userService.getLinkedStaffId(user.id);
    return this.sessionService.getSessionsByTeacherId(staffId, month, year);
  }

  @Get('staff-extra-allowances')
  @ApiOperation({
    summary: 'List current staff extra allowances',
    description:
      'Returns paginated extra allowance records for the current linked staff profile.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: String,
    description: 'Filter by year (e.g. 2026). Use with month.',
    example: '2026',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Filter by month 1-12. Use with year.',
    example: '03',
  })
  @ApiQuery({
    name: 'roleType',
    required: false,
    type: String,
    description: 'Filter by staff role type.',
    example: 'assistant',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by payment status.',
    example: 'pending',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated extra allowance list for current staff.',
  })
  @ApiResponse({ status: 400, description: 'User has no staff record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStaffExtraAllowances(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('roleType') roleType?: string,
    @Query('status') status?: string,
  ) {
    const staffId = await this.userService.getLinkedStaffId(user.id);

    return this.extraAllowanceService.getExtraAllowances({
      ...query,
      year,
      month,
      roleType,
      status,
      staffId,
    });
  }

  @Post('staff-extra-allowances')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create communication extra allowance (self)',
    description:
      'Staff with role `communication` may create one pending extra allowance for themselves per request; amount and month are supplied; admin confirms payment separately.',
  })
  @ApiBody({ type: CreateMyCommunicationExtraAllowanceDto })
  @ApiResponse({
    status: 201,
    description: 'Extra allowance created in pending status.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no staff record.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Not staff or staff lacks communication role.',
  })
  async createMyCommunicationExtraAllowance(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateMyCommunicationExtraAllowanceDto,
  ) {
    return this.extraAllowanceService.createMyCommunicationExtraAllowance(
      user,
      body,
    );
  }

  @Get('staff-lesson-output-stats')
  @ApiOperation({
    summary: 'Get current staff lesson output stats',
    description:
      'Returns lesson output statistics and recent outputs for the current linked staff profile.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Recent window in days (default: 30, max: 365)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson output statistics for current staff.',
  })
  @ApiResponse({ status: 400, description: 'User has no staff record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStaffLessonOutputStats(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    const staffId = await this.userService.getLinkedStaffId(user.id);
    const parsedDays =
      days == null || days.trim() === '' ? undefined : Number(days);

    return this.lessonService.getOutputStatsByStaff(staffId, {
      days: parsedDays,
    });
  }

  @Get('student-detail')
  @ApiOperation({
    summary: 'Get current student detail',
    description:
      'Returns the linked student detail of the current authenticated user with self-safe fields only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current student detail.',
  })
  @ApiResponse({ status: 400, description: 'User has no student record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStudentDetail(@CurrentUser() user: JwtPayload) {
    const studentId = await this.userService.getLinkedStudentId(user.id);
    return this.studentService.getStudentSelfDetail(studentId);
  }

  @Get('student-wallet-history')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Get current student wallet history',
    description:
      'Returns wallet transactions for the current linked student profile only.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of wallet transactions to return.',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet history for current student.',
  })
  @ApiResponse({ status: 400, description: 'User has no student record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyStudentWalletHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: StudentWalletHistoryQueryDto,
  ) {
    const studentId = await this.userService.getLinkedStudentId(user.id);
    return this.studentService.getStudentSelfWalletHistory(studentId, query);
  }

  @Patch('student-account-balance')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Update current student wallet balance',
    description:
      'Applies a signed wallet delta for the current linked student profile. Negative balance is blocked for self-service withdrawals.',
  })
  @ApiBody({ type: UpdateMyStudentAccountBalanceDto })
  @ApiResponse({
    status: 200,
    description: 'Updated current student detail.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error, no student record, or insufficient balance.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyStudentAccountBalance(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyStudentAccountBalanceDto,
  ) {
    const studentId = await this.userService.getLinkedStudentId(user.id);
    return this.studentService.updateMyStudentAccountBalance(studentId, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch()
  @ApiOperation({
    summary: 'Update my profile',
    description:
      'Update current user basic info (first_name, last_name, email, phone, province, accountHandle).',
  })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiResponse({ status: 200, description: 'Updated full profile.' })
  @ApiResponse({
    status: 400,
    description: 'Validation or duplicate email/handle.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyProfileDto,
  ) {
    return this.userService.updateMyProfile(user.id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch('staff')
  @ApiOperation({
    summary: 'Update my staff profile',
    description:
      'Update current user linked staff record. Fails if user has no staff.',
  })
  @ApiBody({ type: UpdateMyStaffProfileDto })
  @ApiResponse({ status: 200, description: 'Updated full profile.' })
  @ApiResponse({ status: 400, description: 'User has no staff record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyStaffProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyStaffProfileDto,
  ) {
    return this.userService.updateMyStaffProfile(user.id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch('student')
  @ApiOperation({
    summary: 'Update my student profile',
    description:
      'Update current user linked student record. Fails if user has no student.',
  })
  @ApiBody({ type: UpdateMyStudentProfileDto })
  @ApiResponse({ status: 200, description: 'Updated full profile.' })
  @ApiResponse({ status: 400, description: 'User has no student record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyStudentProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyStudentProfileDto,
  ) {
    return this.userService.updateMyStudentProfile(user.id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
