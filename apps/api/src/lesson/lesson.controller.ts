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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  BulkUpdateLessonOutputPaymentStatusDto,
  BulkUpdateLessonOutputPaymentStatusResultDto,
  CreateLessonResourceDto,
  CreateLessonOutputDto,
  CreateLessonTaskDto,
  LessonOverviewQueryDto,
  LessonResourceOptionsQueryDto,
  LessonTaskOptionsQueryDto,
  LessonOutputStaffStatsQueryDto,
  LessonOutputStaffOptionsQueryDto,
  LessonWorkQueryDto,
  LessonTaskStaffOptionsQueryDto,
  UpdateLessonResourceDto,
  UpdateLessonOutputDto,
  UpdateLessonTaskDto,
} from '../dtos/lesson.dto';
import { LessonService } from './lesson.service';
import { AdminOnlyDeleteGuard } from './admin-only-delete.guard';
import { LessonManagementGuard } from './lesson-management.guard';

@Controller()
@ApiTags('lesson')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin, UserRole.staff)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get('lesson-overview')
  @ApiOperation({
    summary: 'Get lesson overview',
    description:
      'Load the admin lesson overview summary together with resources and tasks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson overview loaded successfully.',
  })
  async getOverview(
    @CurrentUser() user: JwtPayload,
    @Query() query: LessonOverviewQueryDto,
  ) {
    return this.lessonService.getOverview(query, user);
  }

  @Get('lesson-work')
  @ApiOperation({
    summary: 'Get lesson work board',
    description:
      'Load the admin lesson work board with paginated lesson outputs and task context.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson work board loaded successfully.',
  })
  async getWork(
    @CurrentUser() user: JwtPayload,
    @Query() query: LessonWorkQueryDto,
  ) {
    return this.lessonService.getWork(query, user);
  }

  @Get('lesson-task-staff-options')
  @ApiOperation({
    summary: 'Search staff options for lesson task ownership and execution',
    description:
      'Return lightweight staff options for selecting the responsible owner and task assignees of a lesson task.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson task staff options loaded successfully.',
  })
  @UseGuards(LessonManagementGuard)
  async searchTaskStaffOptions(@Query() query: LessonTaskStaffOptionsQueryDto) {
    return this.lessonService.searchTaskStaffOptions(query);
  }

  @Get('lesson-task-options')
  @ApiOperation({
    summary: 'Search lesson task options for output linking',
    description:
      'Return lightweight lesson task options so admins can re-link one output to another task.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson task options loaded successfully.',
  })
  async searchTaskOptions(
    @CurrentUser() user: JwtPayload,
    @Query() query: LessonTaskOptionsQueryDto,
  ) {
    return this.lessonService.searchTaskOptions(query, user);
  }

  @Get('lesson-resource-options')
  @ApiOperation({
    summary: 'Search lesson resource options for task linking',
    description:
      'Return lightweight lesson resource options so admins can attach existing resources to a lesson task.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson resource options loaded successfully.',
  })
  @UseGuards(LessonManagementGuard)
  async searchResourceOptions(@Query() query: LessonResourceOptionsQueryDto) {
    return this.lessonService.searchResourceOptions(query);
  }

  @Get('lesson-output-staff-options')
  @ApiOperation({
    summary: 'Search staff options for lesson output assignment',
    description:
      'Return lightweight staff options for assigning an owner to lesson outputs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson output staff options loaded successfully.',
  })
  @UseGuards(LessonManagementGuard)
  async searchOutputStaffOptions(
    @Query() query: LessonOutputStaffOptionsQueryDto,
  ) {
    return this.lessonService.searchOutputStaffOptions(query);
  }

  @Get('lesson-output-stats/staff/:staffId')
  @ApiOperation({
    summary: 'Get lesson output stats by staff',
    description:
      'Load aggregated lesson output statistics and recent outputs for one staff.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff id' })
  @ApiResponse({
    status: 200,
    description: 'Lesson output staff statistics loaded successfully.',
  })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  @UseGuards(LessonManagementGuard)
  async getOutputStatsByStaff(
    @Param('staffId', new ParseUUIDPipe()) staffId: string,
    @Query() query: LessonOutputStaffStatsQueryDto,
  ) {
    return this.lessonService.getOutputStatsByStaff(staffId, query);
  }

  @Get('lesson-tasks/:id')
  @ApiOperation({
    summary: 'Get lesson task detail',
    description: 'Load a single lesson task detail by id.',
  })
  @ApiParam({ name: 'id', description: 'Lesson task id' })
  @ApiResponse({ status: 200, description: 'Lesson task loaded.' })
  @ApiResponse({ status: 404, description: 'Lesson task not found.' })
  async getTaskById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.lessonService.getTaskById(id, user);
  }

  @Get('lesson-outputs/:id')
  @ApiOperation({
    summary: 'Get lesson output detail',
    description:
      'Load a single lesson output detail by id. Participant staff can only access outputs inside assigned lesson tasks.',
  })
  @ApiParam({ name: 'id', description: 'Lesson output id' })
  @ApiResponse({ status: 200, description: 'Lesson output loaded.' })
  @ApiResponse({ status: 404, description: 'Lesson output not found.' })
  async getOutputById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.lessonService.getOutputById(id, user);
  }

  @Get('lesson-resources/:id')
  @ApiOperation({
    summary: 'Get lesson resource detail',
    description: 'Load a single lesson resource detail by id.',
  })
  @ApiParam({ name: 'id', description: 'Lesson resource id' })
  @ApiResponse({ status: 200, description: 'Lesson resource loaded.' })
  @ApiResponse({ status: 404, description: 'Lesson resource not found.' })
  @UseGuards(LessonManagementGuard)
  async getResourceById(@Param('id') id: string) {
    return this.lessonService.getResourceById(id);
  }

  @Post('lesson-resources')
  @ApiOperation({
    summary: 'Create lesson resource',
    description:
      'Create a lesson resource for the overview resources list or attach it directly to a lesson task.',
  })
  @ApiBody({
    type: CreateLessonResourceDto,
    description: 'Lesson resource create payload',
  })
  @ApiResponse({ status: 201, description: 'Lesson resource created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  async createResource(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateLessonResourceDto,
  ) {
    return this.lessonService.createResource(
      data,
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
      user,
    );
  }

  @Patch('lesson-resources/:id')
  @ApiOperation({
    summary: 'Update lesson resource',
    description:
      'Update a lesson resource by id, including changing its linked lesson task.',
  })
  @ApiParam({ name: 'id', description: 'Lesson resource id' })
  @ApiBody({
    type: UpdateLessonResourceDto,
    description: 'Lesson resource update payload',
  })
  @ApiResponse({ status: 200, description: 'Lesson resource updated.' })
  @ApiResponse({ status: 404, description: 'Lesson resource not found.' })
  @UseGuards(LessonManagementGuard)
  async updateResource(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() data: UpdateLessonResourceDto,
  ) {
    return this.lessonService.updateResource(id, data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete('lesson-resources/:id')
  @ApiOperation({
    summary: 'Delete lesson resource',
    description: 'Delete a lesson resource by id.',
  })
  @ApiParam({ name: 'id', description: 'Lesson resource id' })
  @ApiResponse({ status: 200, description: 'Lesson resource deleted.' })
  @ApiResponse({ status: 404, description: 'Lesson resource not found.' })
  @UseGuards(LessonManagementGuard, AdminOnlyDeleteGuard)
  async deleteResource(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.lessonService.deleteResource(id, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post('lesson-outputs')
  @ApiOperation({
    summary: 'Create lesson output',
    description: 'Create a lesson output under a lesson task.',
  })
  @ApiBody({
    type: CreateLessonOutputDto,
    description: 'Lesson output create payload',
  })
  @ApiResponse({ status: 201, description: 'Lesson output created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  async createOutput(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateLessonOutputDto,
  ) {
    return this.lessonService.createOutput(
      data,
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
      user,
    );
  }

  @Patch('lesson-outputs/:id')
  @ApiOperation({
    summary: 'Update lesson output',
    description: 'Update a lesson output by id.',
  })
  @ApiParam({ name: 'id', description: 'Lesson output id' })
  @ApiBody({
    type: UpdateLessonOutputDto,
    description: 'Lesson output update payload',
  })
  @ApiResponse({ status: 200, description: 'Lesson output updated.' })
  @ApiResponse({ status: 404, description: 'Lesson output not found.' })
  async updateOutput(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() data: UpdateLessonOutputDto,
  ) {
    return this.lessonService.updateOutput(
      id,
      data,
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
      user,
    );
  }

  @Patch('lesson-outputs/payment-status/bulk')
  @ApiOperation({
    summary: 'Bulk update lesson output payment status',
    description:
      'Update payment status for multiple lesson outputs in a single request.',
  })
  @ApiBody({
    type: BulkUpdateLessonOutputPaymentStatusDto,
    description: 'Bulk payment status update payload',
  })
  @ApiResponse({
    status: 200,
    description: 'Selected lesson outputs updated.',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({
    status: 404,
    description: 'At least one lesson output was not found.',
  })
  @UseGuards(LessonManagementGuard)
  async bulkUpdateOutputPaymentStatus(
    @CurrentUser() user: JwtPayload,
    @Body() data: BulkUpdateLessonOutputPaymentStatusDto,
  ): Promise<BulkUpdateLessonOutputPaymentStatusResultDto> {
    return this.lessonService.bulkUpdateOutputPaymentStatus(
      data.outputIds,
      data.paymentStatus,
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
    );
  }

  @Delete('lesson-outputs/:id')
  @ApiOperation({
    summary: 'Delete lesson output',
    description: 'Delete a lesson output by id.',
  })
  @ApiParam({ name: 'id', description: 'Lesson output id' })
  @ApiResponse({ status: 200, description: 'Lesson output deleted.' })
  @ApiResponse({ status: 404, description: 'Lesson output not found.' })
  @UseGuards(LessonManagementGuard, AdminOnlyDeleteGuard)
  async deleteOutput(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.lessonService.deleteOutput(id, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post('lesson-tasks')
  @ApiOperation({
    summary: 'Create lesson task',
    description:
      'Create a lesson task for the overview tasks list with separate owner and task assignees.',
  })
  @ApiBody({
    type: CreateLessonTaskDto,
    description: 'Lesson task create payload',
  })
  @ApiResponse({ status: 201, description: 'Lesson task created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @UseGuards(LessonManagementGuard)
  async createTask(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateLessonTaskDto,
  ) {
    return this.lessonService.createTask(data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch('lesson-tasks/:id')
  @ApiOperation({
    summary: 'Update lesson task',
    description:
      'Update a lesson task by id, including task assignees independent from lesson output staff.',
  })
  @ApiParam({ name: 'id', description: 'Lesson task id' })
  @ApiBody({
    type: UpdateLessonTaskDto,
    description: 'Lesson task update payload',
  })
  @ApiResponse({ status: 200, description: 'Lesson task updated.' })
  @ApiResponse({ status: 404, description: 'Lesson task not found.' })
  @UseGuards(LessonManagementGuard)
  async updateTask(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() data: UpdateLessonTaskDto,
  ) {
    return this.lessonService.updateTask(id, data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete('lesson-tasks/:id')
  @ApiOperation({
    summary: 'Delete lesson task',
    description: 'Delete a lesson task by id.',
  })
  @ApiParam({ name: 'id', description: 'Lesson task id' })
  @ApiResponse({ status: 200, description: 'Lesson task deleted.' })
  @ApiResponse({ status: 404, description: 'Lesson task not found.' })
  @UseGuards(LessonManagementGuard, AdminOnlyDeleteGuard)
  async deleteTask(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.lessonService.deleteTask(id, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
