import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'generated/enums';
import {
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
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

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
    return this.studentService.updateStudent(data);
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
    return this.studentService.updateStudentAccountBalance(data);
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
    return this.studentService.updateStudentClasses(id, body);
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
    return this.studentService.updateStudentById(id, body);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get student by ID',
    description: 'Get a student by ID.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student found.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async getStudentById(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.studentService.getStudentById(id);
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
    return this.studentService.deleteStudent(id);
  }
}
