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
import { StaffRole, UserRole } from 'generated/enums';
import { AllowStaffRolesOnAdminRoutes } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  CreateStudentDto,
  SearchAssignableStudentUsersDto,
  StudentWalletHistoryQueryDto,
  StudentListQueryDto,
  UpdateStudentAccountBalanceCreateDto,
  UpdateStudentBodyDto,
  UpdateStudentClassesDto,
  UpdateStudentDto,
} from 'src/dtos/student.dto';
import { StudentService } from './student.service';

@ApiTags('student')
@Controller('student')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('assignable-users')
  @ApiOperation({
    summary: 'Search users by email for student assignment',
    description:
      'Search existing users by email and return whether they can be linked to a new student profile.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Full or partial email',
    example: 'student@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching users with eligibility metadata.',
  })
  async searchAssignableUsers(@Query() query: SearchAssignableStudentUsersDto) {
    return this.studentService.searchAssignableUsersByEmail(query.email);
  }

  @Post()
  @ApiOperation({
    summary: 'Create student',
    description: 'Create a student profile from an existing user.',
  })
  @ApiBody({
    type: CreateStudentDto,
    description: 'Student creation payload',
  })
  @ApiResponse({ status: 201, description: 'Created student.' })
  @ApiResponse({ status: 400, description: 'Validation or eligibility error.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async createStudent(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateStudentDto,
  ) {
    return this.studentService.createStudent(data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List students',
    description: 'Get all students. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated students list with data and meta.',
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
    name: 'search',
    required: false,
    type: String,
    description: 'Search by student full name (case-insensitive)',
    example: 'Nguyen',
  })
  @ApiQuery({
    name: 'school',
    required: false,
    type: String,
    description: 'Filter by school name (contains, case-insensitive)',
    example: 'THPT Nguyen Du',
  })
  @ApiQuery({
    name: 'province',
    required: false,
    type: String,
    description: 'Filter by province (contains, case-insensitive)',
    example: 'ha noi',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive'],
    description: 'Filter by student status',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    enum: ['male', 'female'],
    description: 'Filter by gender',
  })
  @ApiQuery({
    name: 'className',
    required: false,
    type: String,
    description: 'Filter by class name (contains, case-insensitive)',
    example: 'Toan 8A',
  })
  async getStudents(
    @CurrentUser() user: JwtPayload,
    @Query() query: StudentListQueryDto,
  ) {
    return this.studentService.getStudents(query);
  }

  @Patch('update-student')
  @ApiOperation({
    summary: 'Update student',
    description: 'Update a student by payload.',
  })
  @ApiBody({
    type: UpdateStudentDto,
    description: 'Student update payload (id required)',
  })
  @ApiResponse({ status: 200, description: 'Updated student.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async updateStudent(
    @CurrentUser() user: JwtPayload,
    @Body() data: UpdateStudentDto,
  ) {
    return this.studentService.updateStudent(data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch('update-student-account-balance')
  @ApiOperation({
    summary: 'Update student account balance',
    description: 'Update a student account balance by payload.',
  })
  @ApiBody({
    type: UpdateStudentAccountBalanceCreateDto,
    description: 'Student account balance update payload',
  })
  @ApiResponse({ status: 200, description: 'Student account balance updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async updateStudentAccountBalance(
    @CurrentUser() user: JwtPayload,
    @Body() data: UpdateStudentAccountBalanceCreateDto,
  ) {
    return this.studentService.updateStudentAccountBalance(data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':id/classes')
  @ApiOperation({
    summary: 'Replace student class memberships',
    description:
      'Replace all classes assigned to the student while preserving existing tuition overrides on unchanged memberships.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiBody({
    type: UpdateStudentClassesDto,
    description: 'Student class membership payload',
  })
  @ApiResponse({ status: 200, description: 'Student classes updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Student or class not found.' })
  async updateStudentClasses(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateStudentClassesDto,
  ) {
    return this.studentService.updateStudentClasses(id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update student by id',
    description: 'Update a student record by route param id.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiBody({
    type: UpdateStudentBodyDto,
    description: 'Student update payload',
  })
  @ApiResponse({ status: 200, description: 'Updated student.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async updateStudentById(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateStudentBodyDto,
  ) {
    return this.studentService.updateStudentById(id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get(':id/wallet-history')
  @ApiOperation({
    summary: 'Get student wallet history',
    description:
      'Get the most recent wallet transactions for a student from wallet_transactions_history.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of wallet transactions to return.',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Student wallet history found.',
  })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async getStudentWalletHistory(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: StudentWalletHistoryQueryDto,
  ) {
    return this.studentService.getStudentWalletHistory(id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get student by ID',
    description: 'Get a student by ID.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student found.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.customer_care)
  async getStudentById(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.studentService.getStudentById(id, {
      userId: user.id,
      roleType: user.roleType,
    });
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete student',
    description: 'Delete a student by ID.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student deleted.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async deleteStudent(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.studentService.deleteStudent(id, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
