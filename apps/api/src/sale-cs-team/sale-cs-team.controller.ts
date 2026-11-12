import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ParseStaffIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  SaleCsTeamListQueryDto,
  SaleCsTeamMonthQueryDto,
  UpdateSaleCsTeamAccountStatusDto,
  UpdateSaleCsTeamProfileDto,
  UpdateSaleCsTeamRolesDto,
} from 'src/dtos/sale-cs-team.dto';
import { SaleCsTeamService } from './sale-cs-team.service';

const FORBIDDEN_NOT_HEAD = 'Không phải Trưởng phòng Sale & CSKH đang active.';

/**
 * Trưởng phòng Sale & CSKH quản lý đội Sale & CSKH (#271). Route khu staff
 * (`@Roles(staff)`), không mở route admin nào; service kiểm role trưởng phòng.
 */
@ApiTags('sale-cs-team')
@Controller('sale-cs-team')
@ApiCookieAuth('access_token')
@Roles(UserRole.staff)
export class SaleCsTeamController {
  constructor(private readonly saleCsTeamService: SaleCsTeamService) {}

  @Get('members')
  @ApiOperation({
    summary: 'Trưởng phòng: danh sách đội Sale & CSKH',
    description:
      'Allowlist: id, họ tên, ảnh, roles, trạng thái nhân sự, khoá tài khoản, trường, % CSKH mặc định (chỉ đọc), trưởng phòng quản lý, số học sinh CSKH, cờ quyền từng dòng. Không email, SĐT, CCCD, ngày sinh, địa chỉ, ngân hàng, lương. `scope=candidates`: nhân sự chưa thuộc đội (không Admin/trưởng) để bật role Sale/CSKH.',
  })
  @ApiResponse({ status: 200, description: 'Trang thành viên.' })
  @ApiResponse({ status: 403, description: FORBIDDEN_NOT_HEAD })
  listMembers(
    @CurrentUser() user: JwtPayload,
    @Query() query: SaleCsTeamListQueryDto,
  ) {
    return this.saleCsTeamService.listMembers(user, query);
  }

  @Get('members/:staffId')
  @ApiOperation({ summary: 'Trưởng phòng: hồ sơ một thành viên đội' })
  @ApiParam({ name: 'staffId', description: 'Staff id (UNISTAFF-…)' })
  @ApiResponse({ status: 200, description: 'Thành viên (allowlist).' })
  @ApiResponse({ status: 403, description: FORBIDDEN_NOT_HEAD })
  @ApiResponse({ status: 404, description: 'Không thuộc đội Sale & CSKH.' })
  getMember(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseStaffIdPipe()) staffId: string,
  ) {
    return this.saleCsTeamService.getMember(user, staffId);
  }

  @Get('members/:staffId/sale-allowances')
  @ApiOperation({
    summary: 'Trưởng phòng: trợ cấp sale của thành viên (ẩn số tiền)',
    description:
      'Chỉ học sinh, ghi chú, tháng, ngày tạo. Không có số tiền, thuế, trạng thái thanh toán.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff id (UNISTAFF-…)' })
  @ApiResponse({ status: 200, description: 'Danh sách trợ cấp sale.' })
  @ApiResponse({ status: 400, description: 'Tháng sai định dạng.' })
  @ApiResponse({ status: 403, description: FORBIDDEN_NOT_HEAD })
  @ApiResponse({ status: 404, description: 'Không thuộc đội Sale & CSKH.' })
  listSaleAllowances(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseStaffIdPipe()) staffId: string,
    @Query() query: SaleCsTeamMonthQueryDto,
  ) {
    return this.saleCsTeamService.listSaleAllowances(user, staffId, query);
  }

  @Get('members/:staffId/bonuses')
  @ApiOperation({
    summary: 'Trưởng phòng: thưởng của thành viên (có số tiền, chỉ đọc)',
    description:
      'Tạo/sửa/thanh toán thưởng vẫn chỉ Admin và Kế toán chi qua /bonuses.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff id (UNISTAFF-…)' })
  @ApiResponse({ status: 200, description: 'Danh sách thưởng.' })
  @ApiResponse({ status: 400, description: 'Tháng sai định dạng.' })
  @ApiResponse({ status: 403, description: FORBIDDEN_NOT_HEAD })
  @ApiResponse({ status: 404, description: 'Không thuộc đội Sale & CSKH.' })
  listBonuses(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseStaffIdPipe()) staffId: string,
    @Query() query: SaleCsTeamMonthQueryDto,
  ) {
    return this.saleCsTeamService.listBonuses(user, staffId, query);
  }

  @Patch('members/:staffId/roles')
  @ApiOperation({
    summary: 'Trưởng phòng: bật/tắt role Sale / CSKH',
    description:
      'Body là trạng thái đích của role sale / customer_care; role khác giữ nguyên. 403 nếu tự chỉnh, target là Admin hoặc mang role trưởng, hoặc body có role ngoài sale/customer_care. 400 nếu bỏ hết role hoặc tắt CSKH khi còn học sinh. Role bị tắt mất mức đè lương cứng / % vận hành (ghi action_history).',
  })
  @ApiParam({ name: 'staffId', description: 'Staff id (UNISTAFF-…)' })
  @ApiBody({ type: UpdateSaleCsTeamRolesDto })
  @ApiResponse({ status: 200, description: 'Roles sau khi lưu.' })
  @ApiResponse({
    status: 400,
    description: 'Bỏ hết role, hoặc tắt CSKH khi còn học sinh.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Không phải Trưởng phòng, tự chỉnh, target Admin/trưởng hoặc role ngoài phạm vi.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân sự.' })
  updateRoles(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseStaffIdPipe()) staffId: string,
    @Body() data: UpdateSaleCsTeamRolesDto,
  ) {
    return this.saleCsTeamService.updateRoles(user, staffId, data);
  }

  @Patch('members/:staffId/account-status')
  @ApiOperation({
    summary: 'Trưởng phòng: khoá / mở khoá tài khoản đăng nhập',
    description:
      'Đổi `users.status` (inactive = khoá). Chỉ khi target CHỈ mang role sale và/hoặc customer_care; mang role khác → 403.',
  })
  @ApiParam({ name: 'staffId', description: 'Staff id (UNISTAFF-…)' })
  @ApiBody({ type: UpdateSaleCsTeamAccountStatusDto })
  @ApiResponse({ status: 200, description: 'Trạng thái khoá sau khi lưu.' })
  @ApiResponse({ status: 400, description: 'Nhân sự chưa có tài khoản.' })
  @ApiResponse({
    status: 403,
    description:
      'Không phải Trưởng phòng, tự khoá, target Admin/trưởng hoặc mang role ngoài Sale/CSKH.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân sự.' })
  updateAccountStatus(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseStaffIdPipe()) staffId: string,
    @Body() data: UpdateSaleCsTeamAccountStatusDto,
  ) {
    return this.saleCsTeamService.updateAccountStatus(user, staffId, data);
  }

  @Patch('members/:staffId/professional-profile')
  @ApiOperation({
    summary: 'Trưởng phòng: sửa hồ sơ chuyên môn',
    description:
      'Chỉ họ, tên, trường đại học, trường THPT. Không sửa được dữ liệu cá nhân, ngân hàng, lương (field ngoài DTO bị loại bỏ).',
  })
  @ApiParam({ name: 'staffId', description: 'Staff id (UNISTAFF-…)' })
  @ApiBody({ type: UpdateSaleCsTeamProfileDto })
  @ApiResponse({ status: 200, description: 'Thành viên sau khi lưu.' })
  @ApiResponse({ status: 400, description: 'Tên trống.' })
  @ApiResponse({
    status: 403,
    description:
      'Không phải Trưởng phòng, tự sửa, target Admin/trưởng hoặc ngoài đội.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân sự.' })
  updateProfessionalProfile(
    @CurrentUser() user: JwtPayload,
    @Param('staffId', new ParseStaffIdPipe()) staffId: string,
    @Body() data: UpdateSaleCsTeamProfileDto,
  ) {
    return this.saleCsTeamService.updateProfessionalProfile(
      user,
      staffId,
      data,
    );
  }
}
