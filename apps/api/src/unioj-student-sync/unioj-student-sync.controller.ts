import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffRole, UserRole } from 'generated/enums';
import { AllowStaffRolesOnAdminRoutes } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { SALE_CS_HEAD_ROLE } from 'src/common/sale-cs-head-access';
import { UniojStudentSyncService } from './unioj-student-sync.service';

@ApiTags('unioj-student-sync')
@Controller('unioj-student-sync')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class UniojStudentSyncController {
  constructor(private readonly sync: UniojStudentSyncService) {}

  @Get('username-check')
  // Cùng nhóm quyền với `POST /users/student`.
  @AllowStaffRolesOnAdminRoutes(SALE_CS_HEAD_ROLE, StaffRole.customer_care)
  @ApiOperation({
    summary: 'Kiểm tra tên đăng nhập dùng được cho tài khoản UNIOJ',
    description:
      'Instance IT: kiểm tra luật username UNIOJ rồi hỏi UNIOJ username còn trống không (không giữ chỗ). Instance khác trả `enabled: false`.',
  })
  @ApiQuery({ name: 'username', required: true, example: 'minh.nguyen' })
  @ApiResponse({
    status: 200,
    description:
      '`{ enabled, username, available, reason: null | INVALID_FORMAT | TAKEN, message }`',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 503,
    description: 'UNIOJ không phản hồi hoặc chưa cấu hình UNIOJ_API_KEY.',
  })
  checkUsername(@Query('username') username: string) {
    return this.sync.checkUsername(username ?? '');
  }
}
