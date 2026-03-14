import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { CfProblemTutorialService } from './cf-problem-tutorial.service';

class UpsertTutorialDto {
  tutorial!: string | null;
}

@Controller('cf-problem-tutorial')
@ApiTags('cf-problem-tutorial')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class CfProblemTutorialController {
  constructor(private readonly service: CfProblemTutorialService) {}

  @Get(':contestId/:problemIndex')
  @ApiOperation({
    summary: 'Get tutorial',
    description: 'Lấy nội dung tutorial cho bài.',
  })
  @ApiParam({ name: 'contestId' })
  @ApiParam({ name: 'problemIndex' })
  @ApiResponse({ status: 200, description: 'Tutorial hoặc null.' })
  async getTutorial(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('problemIndex') problemIndex: string,
  ) {
    const tutorial = await this.service.getTutorial(contestId, problemIndex);
    return { tutorial };
  }

  @Patch(':contestId/:problemIndex')
  @ApiOperation({
    summary: 'Upsert tutorial',
    description: 'Tạo hoặc cập nhật tutorial cho bài.',
  })
  @ApiParam({ name: 'contestId' })
  @ApiParam({ name: 'problemIndex' })
  @ApiBody({ type: UpsertTutorialDto })
  @ApiResponse({ status: 200, description: 'Đã lưu.' })
  async upsertTutorial(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('problemIndex') problemIndex: string,
    @Body() body: UpsertTutorialDto,
  ) {
    return this.service.upsertTutorial(
      contestId,
      problemIndex,
      body.tutorial ?? null,
    );
  }
}
