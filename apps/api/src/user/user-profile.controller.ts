import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import {
  UpdateMyProfileDto,
  UpdateMyStaffProfileDto,
  UpdateMyStudentProfileDto,
} from 'src/dtos/profile.dto';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users/me')
@ApiCookieAuth('access_token')
export class UserProfileController {
  constructor(private readonly userService: UserService) {}

  @Get('full')
  @ApiOperation({
    summary: 'Get full profile',
    description:
      'Returns current user with staffInfo and studentInfo (if linked). Requires access_token cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Full profile (user + staff + student).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getFullProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.getFullProfile(user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update my profile',
    description:
      'Update current user basic info (first_name, last_name, email, phone, province, accountHandle).',
  })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiResponse({ status: 200, description: 'Updated full profile.' })
  @ApiResponse({
    status: 400,
    description: 'Validation or duplicate email/handle.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyProfileDto,
  ) {
    return this.userService.updateMyProfile(user.id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch('staff')
  @ApiOperation({
    summary: 'Update my staff profile',
    description:
      'Update current user linked staff record. Fails if user has no staff.',
  })
  @ApiBody({ type: UpdateMyStaffProfileDto })
  @ApiResponse({ status: 200, description: 'Updated full profile.' })
  @ApiResponse({ status: 400, description: 'User has no staff record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyStaffProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyStaffProfileDto,
  ) {
    return this.userService.updateMyStaffProfile(user.id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch('student')
  @ApiOperation({
    summary: 'Update my student profile',
    description:
      'Update current user linked student record. Fails if user has no student.',
  })
  @ApiBody({ type: UpdateMyStudentProfileDto })
  @ApiResponse({ status: 200, description: 'Updated full profile.' })
  @ApiResponse({ status: 400, description: 'User has no student record.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyStudentProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateMyStudentProfileDto,
  ) {
    return this.userService.updateMyStudentProfile(user.id, body, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
