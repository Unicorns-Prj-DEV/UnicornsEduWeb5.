import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffRole, UserRole } from 'generated/enums';
import { AllowStaffRolesOnAdminRoutes } from '../auth/decorators/allow-staff-roles-on-admin.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateSharedMaterialDto,
  ReorderSetQuestionsDto,
  SharedMaterialFilterDto,
  UpdateSharedMaterialDto,
} from '../dtos/shared-material.dto';
import { SharedMaterialService } from './shared-material.service';

@ApiTags('shared-material')
@ApiCookieAuth('access_token')
@Controller('shared-materials')
@Roles(UserRole.admin)
@AllowStaffRolesOnAdminRoutes(
  StaffRole.assistant,
  StaffRole.teacher,
  StaffRole.lesson_plan,
  StaffRole.lesson_plan_head,
)
export class SharedMaterialController {
  constructor(private readonly service: SharedMaterialService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách Tư liệu dùng chung của khoá (JP)',
    description: 'Kèm `questionCount` = số câu chưa xoá đang gắn.',
  })
  @ApiOkResponse({ description: 'Danh sách tư liệu.' })
  @ApiBadRequestResponse({ description: 'Hồ sơ môn không bật tư liệu' })
  list(@Query() filter: SharedMaterialFilterDto) {
    return this.service.list(filter.courseId);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo Tư liệu dùng chung' })
  @ApiBody({ type: CreateSharedMaterialDto })
  @ApiResponse({ status: 201, description: 'Tư liệu vừa tạo.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu sai / hồ sơ không bật' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSharedMaterialDto,
  ) {
    return this.service.create(dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Sửa Tư liệu dùng chung',
    description: 'Bài làm đã bắt đầu giữ bản chụp lúc start.',
  })
  @ApiParam({ name: 'id', description: 'Shared material ID' })
  @ApiBody({ type: UpdateSharedMaterialDto })
  @ApiOkResponse({ description: 'Tư liệu sau khi sửa.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tư liệu' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSharedMaterialDto,
  ) {
    return this.service.update(id, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get(':id/usage')
  @ApiOperation({
    summary: 'Số tiết thực hành đang dùng Bộ câu hỏi',
    description:
      'Tiết đi theo bộ: thêm / xoá câu trong bộ đổi đề các tiết này cho lượt bắt đầu sau. Dùng để cảnh báo trước khi sửa bộ.',
  })
  @ApiParam({ name: 'id', description: 'Shared material (bộ) ID' })
  @ApiOkResponse({ description: '{ lessonCount, assignedLessonCount }' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bộ' })
  usage(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.usage(id);
  }

  @Put(':id/question-order')
  @ApiOperation({
    summary: 'Sắp lại thứ tự câu trong Bộ câu hỏi',
    description:
      'Gửi đủ mọi câu (chưa xoá) của bộ theo thứ tự mới. Làm bài / ôn nhẹ xếp câu trong khối theo thứ tự này.',
  })
  @ApiParam({ name: 'id', description: 'Shared material (bộ) ID' })
  @ApiBody({ type: ReorderSetQuestionsDto })
  @ApiOkResponse({ description: 'Đã lưu thứ tự.' })
  @ApiBadRequestResponse({
    description: 'Danh sách không khớp đúng các câu của bộ',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bộ' })
  reorderQuestions(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderSetQuestionsDto,
  ) {
    return this.service.reorderQuestions(id, dto.questionIds, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá Tư liệu dùng chung' })
  @ApiParam({ name: 'id', description: 'Shared material ID' })
  @ApiOkResponse({ description: 'Tư liệu đã xoá.' })
  @ApiConflictResponse({ description: 'Còn câu hỏi đang gắn tư liệu' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tư liệu' })
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(id, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
