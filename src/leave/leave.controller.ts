import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveDto, LeaveType, LeaveStatus } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';

@ApiTags('leave')
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: 'Create leave request' })
  @ApiResponse({
    status: 201,
    description: 'Leave request created successfully',
  })
  async create(@Body() createLeaveDto: CreateLeaveDto) {
    return this.leaveService.create(createLeaveDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leave requests with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @ApiQuery({ name: 'leaveType', required: false, enum: LeaveType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Leave requests retrieved successfully',
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('leaveType') leaveType?: LeaveType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 100,
  ) {
    return this.leaveService.findAll(
      userId,
      status,
      leaveType,
      startDate,
      endDate,
      page,
      perPage,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get leave statistics' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'Leave statistics retrieved successfully',
  })
  async getStats(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leaveService.getStats(userId, startDate, endDate);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get leave requests by user ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'User leave requests retrieved successfully',
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leaveService.findByUser(userId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Leave request retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update leave request' })
  @ApiResponse({
    status: 200,
    description: 'Leave request updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async update(
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
  ) {
    return this.leaveService.update(id, updateLeaveDto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve leave request' })
  @ApiResponse({
    status: 200,
    description: 'Leave request approved successfully',
  })
  async approve(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy: string,
  ) {
    return this.leaveService.approve(id, approvedBy);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject leave request' })
  @ApiResponse({
    status: 200,
    description: 'Leave request rejected successfully',
  })
  async reject(
    @Param('id') id: string,
    @Body('rejectedBy') rejectedBy: string,
    @Body('rejectionReason') rejectionReason?: string,
  ) {
    return this.leaveService.reject(id, rejectedBy, rejectionReason);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiResponse({
    status: 200,
    description: 'Leave request cancelled successfully',
  })
  async cancel(@Param('id') id: string) {
    return this.leaveService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete leave request' })
  @ApiResponse({
    status: 200,
    description: 'Leave request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async remove(@Param('id') id: string) {
    return this.leaveService.remove(id);
  }

  @Get('remaining/:userId')
  @ApiOperation({ summary: 'Get remaining leave for a user' })
  @ApiResponse({
    status: 200,
    description: 'Remaining leave retrieved successfully',
  })
  async getRemainingLeave(@Param('userId') userId: string) {
    return this.leaveService.getRemainingLeave(userId);
  }
}
