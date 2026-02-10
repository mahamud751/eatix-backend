import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { TaskAssignmentService } from './task-assignment.service';
import {
  CreateTaskAssignmentDto,
  UpdateTaskAssignmentDto,
} from '../dto/task-assignment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('task-assignment')
export class TaskAssignmentController {
  constructor(private readonly taskAssignmentService: TaskAssignmentService) {}

  @Post()
  async createTask(@Body() createTaskDto: CreateTaskAssignmentDto, @Req() req) {
    // No validation - save as-is
    return this.taskAssignmentService.createTask(createTaskDto);
  }

  @Get()
  async getAllTasks(
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.taskAssignmentService.getAllTasksPublic(status, companyId);
  }

  @Get(':id')
  async getTaskById(@Param('id') id: string) {
    return this.taskAssignmentService.getTaskById(id);
  }

  @Put(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskAssignmentDto,
    @Req() req,
  ) {
    // No authentication required for updates
    return this.taskAssignmentService.updateTask(id, updateTaskDto, '');
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string, @Req() req) {
    // No authentication required for deletion
    return this.taskAssignmentService.deleteTask(id, '');
  }

  @Get('company/:companyId')
  async getTasksByCompanyId(@Param('companyId') companyId: string) {
    return this.taskAssignmentService.getTasksByCompanyId(companyId);
  }

  @Get('assignee/:assignToId')
  async getTasksByAssignee(@Param('assignToId') assignToId: string) {
    return this.taskAssignmentService.getTasksByAssignee(assignToId);
  }

  @Get('my/created')
  async getMyCreatedTasks(@Req() req) {
    // Return empty array since no authentication
    return [];
  }

  @Get('my/assigned')
  async getMyAssignedTasks(@Req() req) {
    // Return empty array since no authentication
    return [];
  }
}
