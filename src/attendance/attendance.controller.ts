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
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceDto,
  AttendanceStatus,
} from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create attendance record' })
  @ApiResponse({
    status: 201,
    description: 'Attendance created successfully',
  })
  async create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attendance records with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceStatus })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Attendance records retrieved successfully',
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('date') date?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 100,
  ) {
    return this.attendanceService.findAll(
      userId,
      date,
      status,
      startDate,
      endDate,
      page,
      perPage,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get attendance statistics' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'Attendance statistics retrieved successfully',
  })
  async getStats(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getStats(userId, startDate, endDate);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get attendance by user ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'User attendance retrieved successfully',
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.findByUser(userId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance by ID' })
  @ApiResponse({
    status: 200,
    description: 'Attendance retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update attendance' })
  @ApiResponse({
    status: 200,
    description: 'Attendance updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attendance' })
  @ApiResponse({
    status: 200,
    description: 'Attendance deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }

  @Post('generate-absent')
  @ApiOperation({
    summary: 'Generate absent records for employees who did not clock in',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date to generate absent records for (defaults to today)',
  })
  @ApiResponse({
    status: 201,
    description: 'Absent records generated successfully',
  })
  async generateAbsentRecords(@Query('date') date?: string) {
    return this.attendanceService.generateAbsentRecords(date);
  }

  @Post('generate-absent-range')
  @ApiOperation({
    summary: 'Generate absent records for a date range',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 201,
    description: 'Absent records generated successfully for date range',
  })
  async generateAbsentRecordsForRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.generateAbsentRecordsForRange(
      startDate,
      endDate,
    );
  }
}
