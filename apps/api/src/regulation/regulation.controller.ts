import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffRole, UserRole } from 'generated/enums';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { AllowStaffRolesOnAdminRoutes } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  type RegulationItemDto,
  CreateRegulationDto,
  UpdateRegulationDto,
} from 'src/dtos/regulation.dto';
import { RegulationService } from './regulation.service';

@Controller('regulations')
@ApiTags('regulations')
@ApiCookieAuth('access_token')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RegulationController {
  constructor(private readonly regulationService: RegulationService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.staff)
  @ApiOperation({
    summary: 'List regulations for the current actor',
    description:
      'Admin and assistant receive the full list. Other staff only receive regulations matching their role tags.',
  })
  @ApiResponse({
    status: 200,
    description: 'Regulation list for the current actor.',
  })
  async getRegulations(
    @CurrentUser() user: JwtPayload,
  ): Promise<RegulationItemDto[]> {
    return this.regulationService.getRegulations(user);
  }

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({
    summary: 'Create a regulation',
    description:
      'Create a new regulation post for the notes-subject regulations tab.',
  })
  @ApiBody({
    type: CreateRegulationDto,
    description: 'Regulation payload.',
  })
  @ApiResponse({
    status: 201,
    description: 'Regulation created.',
  })
  async createRegulation(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateRegulationDto,
  ): Promise<RegulationItemDto> {
    return this.regulationService.createRegulation(user, data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({
    summary: 'Update a regulation',
    description:
      'Update an existing regulation post for the notes-subject regulations tab.',
  })
  @ApiParam({
    name: 'id',
    description: 'Regulation id',
  })
  @ApiBody({
    type: UpdateRegulationDto,
    description: 'Regulation fields to update.',
  })
  @ApiResponse({
    status: 200,
    description: 'Regulation updated.',
  })
  async updateRegulation(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateRegulationDto,
  ): Promise<RegulationItemDto> {
    return this.regulationService.updateRegulation(id, user, data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
