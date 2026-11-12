import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
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
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { TrainingTutorListQueryDto } from 'src/dtos/training-tutor.dto';
import { achievementImageUploadInterceptor } from 'src/achievements/achievement-image-upload';
import { AchievementService } from 'src/achievements/achievement.service';
import {
  CreateAchievementDto,
  ReorderAchievementsDto,
  UpdateAchievementDto,
} from 'src/dtos/achievement.dto';
import { TrainingTutorService } from './training-tutor.service';

type UploadedImage = { buffer: Buffer; mimetype: string; size: number };

@ApiTags('training-tutors')
@Controller('training/tutors')
@ApiCookieAuth('access_token')
@Roles(UserRole.staff, UserRole.admin)
export class TrainingTutorController {
  constructor(
    private readonly trainingTutorService: TrainingTutorService,
    private readonly achievementService: AchievementService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Ban Đào Tạo: danh sách gia sư (gồm cả inactive)',
    description:
      'Chỉ trả field allowlist: id, fullName, status, roles, avatarUrl, university, highSchool, achievementCount, currentClasses (Lớp đang dạy: {id, name}[]). `scope=all`: mọi nhân sự — chỉ Trưởng ban Đào tạo/admin, Ban Đào Tạo thường 403.',
  })
  @ApiResponse({ status: 200, description: 'Paginated tutor summaries.' })
  @ApiResponse({ status: 403, description: 'Không phải Ban Đào Tạo.' })
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: TrainingTutorListQueryDto,
  ) {
    return this.trainingTutorService.listTutors(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ban Đào Tạo: hồ sơ gia sư + Lớp đang dạy / Lớp đã nghỉ',
  })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiResponse({
    status: 200,
    description: 'Tutor detail without hidden fields.',
  })
  @ApiResponse({ status: 403, description: 'Không phải Ban Đào Tạo.' })
  @ApiResponse({
    status: 404,
    description:
      'Không phải gia sư (Ban Đào Tạo thường) hoặc không tồn tại. Trưởng ban/admin mở được mọi nhân sự.',
  })
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
  ) {
    return this.trainingTutorService.getTutor(user, staffId);
  }

  @Get(':id/sessions')
  @ApiOperation({
    summary: 'Ban Đào Tạo: buổi gia sư đã dạy (không có tiền)',
  })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated sessions: date, time, class.',
  })
  @ApiResponse({ status: 403, description: 'Không phải Ban Đào Tạo.' })
  @ApiResponse({ status: 404, description: 'Không phải gia sư.' })
  sessions(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.trainingTutorService.listTutorSessions(user, staffId, query);
  }

  @Get(':id/achievements')
  @ApiOperation({ summary: 'Ban Đào Tạo: thành tích gia sư' })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiResponse({ status: 200, description: 'Achievements in profile order.' })
  @ApiResponse({ status: 403, description: 'Không phải Ban Đào Tạo.' })
  @ApiResponse({ status: 404, description: 'Không phải gia sư.' })
  achievements(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
  ) {
    return this.trainingTutorService.listTutorAchievements(user, staffId);
  }

  // Ban Đào Tạo sửa thành tích như admin: không ràng buộc minh chứng, ghi lịch
  // sử thao tác (trừ sắp xếp). Phạm vi = phạm vi xem; hồ sơ của mình → 403.

  @Post(':id/achievements')
  @UseInterceptors(achievementImageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Ban Đào Tạo: thêm thành tích (ảnh tuỳ chọn)',
  })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        sortOrder: { type: 'integer' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Created achievement.' })
  @ApiResponse({ status: 400, description: 'Missing title or invalid image.' })
  @ApiResponse({
    status: 403,
    description: 'Không phải Ban Đào Tạo hoặc hồ sơ của chính mình.',
  })
  @ApiResponse({ status: 404, description: 'Ngoài phạm vi xem.' })
  async createAchievement(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Body() body: CreateAchievementDto,
    @UploadedFile() file?: UploadedImage,
  ) {
    const editor = await this.trainingTutorService.resolveAchievementEditor(
      user,
      staffId,
    );
    return this.achievementService.createStaffAchievement(
      staffId,
      body,
      file,
      editor,
    );
  }

  @Patch(':id/achievements/:achievementId')
  @ApiOperation({ summary: 'Ban Đào Tạo: sửa tiêu đề/sortOrder thành tích' })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiParam({ name: 'achievementId', description: 'Achievement UUID' })
  @ApiBody({ type: UpdateAchievementDto })
  @ApiResponse({ status: 200, description: 'Updated achievement.' })
  @ApiResponse({
    status: 403,
    description: 'Không phải Ban Đào Tạo hoặc hồ sơ của chính mình.',
  })
  @ApiResponse({ status: 404, description: 'Ngoài phạm vi / không có.' })
  async updateAchievement(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Body() body: UpdateAchievementDto,
  ) {
    const editor = await this.trainingTutorService.resolveAchievementEditor(
      user,
      staffId,
    );
    return this.achievementService.updateStaffAchievement(
      staffId,
      achievementId,
      body,
      editor,
    );
  }

  @Delete(':id/achievements/:achievementId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban Đào Tạo: xoá thành tích (kèm ảnh)' })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiParam({ name: 'achievementId', description: 'Achievement UUID' })
  @ApiResponse({ status: 200, description: 'Deleted.' })
  @ApiResponse({
    status: 403,
    description: 'Không phải Ban Đào Tạo hoặc hồ sơ của chính mình.',
  })
  @ApiResponse({ status: 404, description: 'Ngoài phạm vi / không có.' })
  async deleteAchievement(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
  ) {
    const editor = await this.trainingTutorService.resolveAchievementEditor(
      user,
      staffId,
    );
    return this.achievementService.deleteStaffAchievement(
      staffId,
      achievementId,
      editor,
    );
  }

  @Put(':id/achievements/reorder')
  @ApiOperation({ summary: 'Ban Đào Tạo: sắp xếp thành tích' })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiBody({ type: ReorderAchievementsDto })
  @ApiResponse({ status: 200, description: 'Reordered list.' })
  @ApiResponse({ status: 400, description: 'Incomplete or invalid id set.' })
  @ApiResponse({
    status: 403,
    description: 'Không phải Ban Đào Tạo hoặc hồ sơ của chính mình.',
  })
  async reorderAchievements(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Body() body: ReorderAchievementsDto,
  ) {
    await this.trainingTutorService.resolveAchievementEditor(user, staffId);
    return this.achievementService.reorderStaffAchievements(staffId, body);
  }

  @Put(':id/achievements/:achievementId/highlight')
  @ApiOperation({
    summary: 'Ban Đào Tạo: gắn sao thành tích nổi bật (không cần ảnh)',
  })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiParam({ name: 'achievementId', description: 'Achievement UUID' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thành tích sau khi đổi, dòng có sao đứng đầu.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không phải Ban Đào Tạo hoặc hồ sơ của chính mình.',
  })
  @ApiResponse({ status: 404, description: 'Ngoài phạm vi / không có.' })
  async setHighlightAchievement(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
  ) {
    const editor = await this.trainingTutorService.resolveAchievementEditor(
      user,
      staffId,
    );
    return this.achievementService.setStaffHighlightAchievement(
      staffId,
      achievementId,
      editor,
    );
  }

  @Post(':id/achievements/:achievementId/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(achievementImageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Ban Đào Tạo: tải/thay ảnh minh chứng' })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiParam({ name: 'achievementId', description: 'Achievement UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Achievement with signed URL.' })
  @ApiResponse({ status: 400, description: 'Invalid image.' })
  @ApiResponse({
    status: 403,
    description: 'Không phải Ban Đào Tạo hoặc hồ sơ của chính mình.',
  })
  async uploadAchievementImage(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @UploadedFile() file?: UploadedImage,
  ) {
    const editor = await this.trainingTutorService.resolveAchievementEditor(
      user,
      staffId,
    );
    return this.achievementService.uploadStaffAchievementImage(
      staffId,
      achievementId,
      file,
      editor,
    );
  }

  @Delete(':id/achievements/:achievementId/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ban Đào Tạo: gỡ ảnh minh chứng (kể cả dòng có sao)',
  })
  @ApiParam({ name: 'id', description: 'Staff id (UNISTAFF-…)' })
  @ApiParam({ name: 'achievementId', description: 'Achievement UUID' })
  @ApiResponse({ status: 200, description: 'Achievement without image.' })
  @ApiResponse({
    status: 403,
    description: 'Không phải Ban Đào Tạo hoặc hồ sơ của chính mình.',
  })
  @ApiResponse({ status: 404, description: 'Ngoài phạm vi / không có.' })
  async deleteAchievementImage(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseStaffIdPipe()) staffId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
  ) {
    const editor = await this.trainingTutorService.resolveAchievementEditor(
      user,
      staffId,
    );
    return this.achievementService.deleteStaffAchievementImage(
      staffId,
      achievementId,
      editor,
    );
  }
}
