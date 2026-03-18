import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { UserRole } from 'generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCostDto, UpdateCostDto } from '../dtos/cost.dto';
import { PaginationQueryDto } from '../dtos/pagination.dto';
import { CostService } from './cost.service';

@Controller('cost')
@ApiTags('cost')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class CostController {
  constructor(private readonly costService: CostService) {}

  @Get()
  @ApiOperation({
    summary: 'List costs',
    description: 'Get paginated cost list.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by category (contains, case-insensitive)',
    example: 'marketing',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: String,
    description: 'Filter by year (e.g. 2025). Use with month.',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Filter by month 1-12. Use with year.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated cost list with data and meta.',
  })
  async getCosts(
    @Query() query: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.costService.getCosts({
      ...query,
      search,
      year,
      month,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get cost by id',
    description: 'Get a single cost record by id.',
  })
  @ApiParam({ name: 'id', description: 'Cost id' })
  @ApiResponse({ status: 200, description: 'Cost found.' })
  @ApiResponse({ status: 404, description: 'Cost not found.' })
  async getCostById(@Param('id') id: string) {
    return this.costService.getCostById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create cost',
    description: 'Create a new cost record.',
  })
  @ApiBody({ type: CreateCostDto, description: 'Cost create payload' })
  @ApiResponse({ status: 201, description: 'Cost created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  async createCost(@Body() data: CreateCostDto) {
    return this.costService.createCost(data);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update cost',
    description: 'Update a cost record.',
  })
  @ApiBody({
    type: UpdateCostDto,
    description: 'Cost update payload (id required)',
  })
  @ApiResponse({ status: 200, description: 'Cost updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Cost not found.' })
  async updateCost(@Body() data: UpdateCostDto) {
    return this.costService.updateCost(data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete cost',
    description: 'Delete a cost record by id.',
  })
  @ApiParam({ name: 'id', description: 'Cost id' })
  @ApiResponse({ status: 200, description: 'Cost deleted.' })
  @ApiResponse({ status: 404, description: 'Cost not found.' })
  async deleteCost(@Param('id') id: string) {
    return this.costService.deleteCost(id);
  }
}
