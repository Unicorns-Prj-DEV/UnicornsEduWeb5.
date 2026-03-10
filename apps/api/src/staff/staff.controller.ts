import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CreateStaffDto, UpdateStaffDto } from 'src/dtos/staff.dto';
import { StaffService } from './staff.service';

@Controller('staff')
@ApiTags('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Get()
    @ApiOperation({ summary: 'List staff', description: 'Get all staff records.' })
    @ApiResponse({ status: 200, description: 'List of staff.' })
    async getStaff() {
        return this.staffService.getStaff();
    }

    @Post()
    @ApiOperation({ summary: 'Create staff', description: 'Create a new staff record.' })
    @ApiBody({ type: CreateStaffDto, description: 'Staff create payload' })
    @ApiResponse({ status: 201, description: 'Staff created.' })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async createStaff(@Body() data: CreateStaffDto) {
        return this.staffService.createStaff(data);
    }

    @Patch()
    @ApiOperation({ summary: 'Update staff', description: 'Update a staff record.' })
    @ApiBody({ type: UpdateStaffDto, description: 'Staff update payload (id required)' })
    @ApiResponse({ status: 200, description: 'Staff updated.' })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    @ApiResponse({ status: 404, description: 'Staff not found.' })
    async updateStaff(@Body() data: UpdateStaffDto) {
        return this.staffService.updateStaff(data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete staff', description: 'Delete a staff record by id.' })
    @ApiParam({ name: 'id', description: 'Staff id' })
    @ApiResponse({ status: 200, description: 'Staff deleted.' })
    @ApiResponse({ status: 404, description: 'Staff not found.' })
    async deleteStaff(@Param('id') id: string) {
        return this.staffService.deleteStaff(id);
    }
}
