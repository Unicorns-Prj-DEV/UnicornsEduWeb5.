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
import { StaffRole, UserRole } from 'generated/enums';
import { AllowStaffRolesOnAdminRoutes } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  CreateClassCategoryDto,
  UpdateClassCategoryDto,
} from 'src/dtos/class.dto';
import { ClassCategoryService } from './class-category.service';

@Controller('class-categories')
@ApiTags('class-categories')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin, UserRole.staff)
export class ClassCategoryController {
  constructor(private readonly classCategoryService: ClassCategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'List class categories',
    description:
      'Danh sách phân loại lớp (VIP, Basic, Advance, Hardcore, THPT Basic, ...). Dùng cho dropdown chọn phân loại khi tạo/sửa lớp.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Include deactivated categories (admin only).',
  })
  @ApiResponse({ status: 200, description: 'List of class categories.' })
  async list(@Query('includeInactive') includeInactive?: string) {
    return this.classCategoryService.list(includeInactive === 'true');
  }

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({ summary: 'Create a new class category' })
  @ApiBody({ type: CreateClassCategoryDto })
  @ApiResponse({ status: 201, description: 'Class category created.' })
  async create(@Body() dto: CreateClassCategoryDto) {
    return this.classCategoryService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({ summary: 'Update a class category' })
  @ApiParam({ name: 'id', description: 'Class category id' })
  @ApiBody({ type: UpdateClassCategoryDto })
  @ApiResponse({ status: 200, description: 'Class category updated.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassCategoryDto,
  ) {
    return this.classCategoryService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({
    summary: 'Delete a class category',
    description:
      'Chỉ xoá được khi không còn lớp nào dùng phân loại này. Nếu muốn ẩn tạm thời, dùng PATCH với is_active=false.',
  })
  @ApiParam({ name: 'id', description: 'Class category id' })
  @ApiResponse({ status: 200, description: 'Class category deleted.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.classCategoryService.remove(id);
  }
}
