import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateClassDto, UpdateClassDto } from 'src/dtos/class.dto';
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

  @Get(':id')
  @ApiOperation({
    summary: 'Get class by id',
    description: 'Get a single class record by id.',
  })
  @ApiParam({ name: 'id', description: 'Class id' })
  @ApiResponse({ status: 200, description: 'Class found.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async getClassById(@Param('id') id: string) {
    return this.classService.getClassById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create class',
    description: 'Create a new class record.',
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
  async deleteClass(@Param('id') id: string) {
    return this.classService.deleteClass(id);
  }
}
