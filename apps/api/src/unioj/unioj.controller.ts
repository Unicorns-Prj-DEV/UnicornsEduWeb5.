import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { UniojService } from './unioj.service';

@Controller('unioj')
@ApiTags('unioj')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin, UserRole.staff, UserRole.student)
export class UniojController {
  constructor(private readonly uniojService: UniojService) {}

  @Get('report')
  @ApiOperation({
    summary: 'Get UNIOJ student progress report',
    description:
      'Tra cứu báo cáo tiến độ học tập của học viên theo tên từ hệ thống UNIOJ.',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Tên đầy đủ của học viên',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Số ngày thống kê (7-365)',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu báo cáo JSON.' })
  async getReport(
    @Query('name') name: string,
    @Query('days') days?: string,
  ): Promise<unknown> {
    const parsedDays = days ? Number.parseInt(days, 10) : undefined;
    return this.uniojService.getStudentReport(name, parsedDays);
  }

  @Get('report/pdf')
  @ApiOperation({
    summary: 'Get UNIOJ student PDF report',
    description:
      'Tải/Stream báo cáo PDF của học viên theo tên từ hệ thống UNIOJ.',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Tên đầy đủ của học viên',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Số ngày thống kê (7-365)',
  })
  @ApiResponse({ status: 200, description: 'File PDF báo cáo.' })
  async getReportPdf(
    @Query('name') name: string,
    @Query('days') days?: string,
  ): Promise<StreamableFile> {
    const parsedDays = days ? Number.parseInt(days, 10) : undefined;
    const { data, headers } = await this.uniojService.getStudentReportPdf(
      name,
      parsedDays,
    );

    return new StreamableFile(data, {
      type: headers['content-type'] || 'application/pdf',
      disposition: headers['content-disposition'],
    });
  }

  @Get('classes-levels')
  @ApiOperation({
    summary: 'Get dominant levels for a list of classes',
    description:
      'Tính toán level chủ đạo của các lớp học từ kết quả UNIOJ của học sinh trong các lớp đó.',
  })
  @ApiQuery({
    name: 'classIds',
    required: true,
    description: 'Danh sách ID lớp học, phân tách bằng dấu phẩy',
  })
  @ApiResponse({
    status: 200,
    description: 'Bản đồ classId -> level hoặc null.',
  })
  async getClassesLevels(
    @Query('classIds') classIds: string,
  ): Promise<Record<string, string | null>> {
    const ids = (classIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.uniojService.getClassesDominantLevels(ids);
  }
}
