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
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  CreateClassDto,
  UpdateClassBasicInfoDto,
  UpdateClassDto,
  UpdateClassScheduleDto,
  UpdateClassStudentsDto,
  UpdateClassTeachersDto,
} from 'src/dtos/class.dto';
import { ClassService } from './class.service';

@Controller('class')
@ApiTags('class')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @ApiOperation({
    summary: 'List classes',
    description: 'Get paginated class list.',
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
    description: 'Search by class name',
    example: 'Math',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['running', 'ended'],
    description: 'Filter by class status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['vip', 'basic', 'advance', 'hardcore'],
    description: 'Filter by class type',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated class list with data and meta.',
  })
  async getClasses(
    @Query() query: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.classService.getClasses({
      ...query,
      search,
      status,
      type,
    });
  }

  @Get(':id/students')
  @ApiOperation({
    summary: 'Get students by class id',
    description:
      'Get list of students enrolled in the class.',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiResponse({ status: 200, description: 'List of students in the class.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async getStudentsByClassId(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.classService.getStudentsByClassId(id);
  }

  @Patch(':id/basic-info')
  @ApiOperation({
    summary: 'Update class basic info',
    description:
      'Update basic info and tuition. When allowance_per_session_per_student is sent, all class_teachers.customAllowance for this class are set to that value.',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiBody({ type: UpdateClassBasicInfoDto })
  @ApiResponse({ status: 200, description: 'Class updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async updateClassBasicInfo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClassBasicInfoDto,
  ) {
    return this.classService.updateClassBasicInfo(id, dto);
  }

  @Patch(':id/teachers')
  @ApiOperation({
    summary: 'Update class teachers',
    description:
      'Replace the list of teachers (and their custom allowance) for the class.',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiBody({ type: UpdateClassTeachersDto })
  @ApiResponse({ status: 200, description: 'Class updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async updateClassTeachers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClassTeachersDto,
  ) {
    return this.classService.updateClassTeachers(id, dto);
  }

  @Patch(':id/schedule')
  @ApiOperation({
    summary: 'Update class schedule',
    description:
      'Replace the class schedule (array of { from, to } in HH:mm:ss).',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiBody({ type: UpdateClassScheduleDto })
  @ApiResponse({ status: 200, description: 'Class updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async updateClassSchedule(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClassScheduleDto,
  ) {
    return this.classService.updateClassSchedule(id, dto);
  }

  @Patch(':id/students')
  @ApiOperation({
    summary: 'Update class students',
    description: 'Replace the list of students in the class.',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiBody({ type: UpdateClassStudentsDto })
  @ApiResponse({ status: 200, description: 'Class updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async updateClassStudents(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClassStudentsDto,
  ) {
    return this.classService.updateClassStudents(id, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get class by id',
    description: 'Get a single class record by id.',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiResponse({ status: 200, description: 'Class found.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async getClassById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.classService.getClassById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create class',
    description:
      'Create a new class record. Class id is auto-generated by backend.',
  })
  @ApiBody({ type: CreateClassDto, description: 'Class create payload' })
  @ApiResponse({ status: 201, description: 'Class created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  async createClass(@Body() data: CreateClassDto) {
    return this.classService.createClass(data);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update class',
    description: 'Update a class record.',
  })
  @ApiBody({
    type: UpdateClassDto,
    description: 'Class update payload (id required)',
  })
  @ApiResponse({ status: 200, description: 'Class updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async updateClass(@Body() data: UpdateClassDto) {
    return this.classService.updateClass(data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete class',
    description: 'Delete a class record by id.',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiResponse({ status: 200, description: 'Class deleted.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async deleteClass(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.classService.deleteClass(id);
  }
}
