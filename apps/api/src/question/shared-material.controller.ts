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
