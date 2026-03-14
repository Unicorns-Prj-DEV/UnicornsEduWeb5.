import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CodeforcesService,
  CfContest,
  CfProblem,
} from './codeforces.service';

@Controller('codeforces')
@ApiTags('codeforces')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class CodeforcesController {
  constructor(private readonly codeforcesService: CodeforcesService) {}

  @Get('doc-groups')
  @ApiOperation({
    summary: 'List doc groups',
    description: 'Danh sách 3 nhóm tài liệu (từ env).',
  })
  @ApiResponse({ status: 200, description: 'Danh sách nhóm tài liệu.' })
  getDocGroups() {
    return this.codeforcesService.getDocGroups();
  }

  @Get('contests')
  @ApiOperation({
    summary: 'List contests',
    description: 'Danh sách contest của group Codeforces (theo thứ tự gốc).',
  })
  @ApiQuery({
    name: 'groupCode',
    required: true,
    description: 'Code của group (từ doc-groups)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách contest.' })
  async getContests(
    @Query('groupCode') groupCode?: string,
  ): Promise<CfContest[]> {
    return this.codeforcesService.getContests(groupCode);
  }

  @Get('contests/:contestId/problems')
  @ApiOperation({
    summary: 'List problems of contest',
    description: 'Danh sách bài trong contest (theo thứ tự gốc).',
  })
  @ApiParam({ name: 'contestId', description: 'Codeforces contest ID' })
  @ApiResponse({ status: 200, description: 'Danh sách bài.' })
  async getContestProblems(
    @Param('contestId', ParseIntPipe) contestId: number,
  ): Promise<CfProblem[]> {
    return this.codeforcesService.getContestProblems(contestId);
  }
}
