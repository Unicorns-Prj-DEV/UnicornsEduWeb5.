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
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateUserDto, UpdateUserDto } from 'src/dtos/user.dto';
import { assertAdminUser } from 'src/app.service';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
@ApiCookieAuth('access_token')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private assertAdmin(user: JwtPayload) {
    assertAdminUser(user);
  }

  @Get()
  @ApiOperation({
    summary: 'List users',
    description: 'Get all users. Admin only.',
  })
  @ApiResponse({ status: 200, description: 'List of users.' })
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
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only.' })
  async getUsers(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    this.assertAdmin(user);
    return this.userService.getUsers(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get a user by ID. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUserById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.userService.getUserById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create user',
    description: 'Create a new user. Admin only.',
  })
  @ApiBody({
    type: CreateUserDto,
    description:
      'User data (email, phone, password, name, roleType, province, accountHandle)',
  })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email/handle exists.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only.' })
  async createUser(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateUserDto,
  ) {
    this.assertAdmin(user);
    return this.userService.createUser(data);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update user',
    description: 'Update a user. Admin only.',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User update data (id required, other fields optional)',
  })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email/handle exists.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUser(
    @CurrentUser() user: JwtPayload,
    @Body() data: UpdateUserDto,
  ) {
    this.assertAdmin(user);
    return this.userService.updateUser(data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user by ID. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({
    status: 400,
    description: 'User linked to staff/student/histories.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deleteUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.userService.deleteUser(id);
  }
}
