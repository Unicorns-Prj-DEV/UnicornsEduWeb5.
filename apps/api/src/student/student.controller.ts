import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
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
import { assertAdminUser } from 'src/app.service';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { UpdateStudentDto } from 'src/dtos/student.dto';
import { StudentService } from './student.service';

@ApiTags('student')
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  private assertAdmin(user: JwtPayload) {
    assertAdminUser(user);
  }

  @Get()
  @ApiOperation({ summary: 'List students', description: 'Get all students.' })
  @ApiResponse({ status: 200, description: 'List of students.' })
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
  async getStudents(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    this.assertAdmin(user);
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
    this.assertAdmin(user);
    return this.studentService.updateStudent(data);
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
    @Param('id') id: string,
  ) {
    this.assertAdmin(user);
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
    @Param('id') id: string,
  ) {
    this.assertAdmin(user);
    return this.studentService.deleteStudent(id);
  }
}
