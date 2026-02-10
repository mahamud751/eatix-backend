import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTaskAssignmentDto,
  UpdateTaskAssignmentDto,
  TaskStatus,
  TaskPriority,
} from '../dto/task-assignment.dto';

@Injectable()
export class TaskAssignmentService {
  constructor(private prisma: PrismaService) {}

  async createTask(createTaskDto: CreateTaskAssignmentDto) {
    try {
      // No validation - save as-is
      const task = await this.prisma.taskAssignment.create({
        data: {
          ...createTaskDto,
          dueDate: new Date(createTaskDto.dueDate),
          status: 'assigned',
          priority: createTaskDto.priority || 'medium',
          createdBy: createTaskDto.createdBy || 'SYSTEM',
        },
      });

      return task;
    } catch (error) {
      throw error;
    }
  }

  async getAllTasksPublic(status?: string, companyId?: string) {
    return this.getAllTasks(undefined, status, companyId);
  }

  async getAllTasks(userId?: string, status?: string, companyId?: string) {
    try {
      const where: any = {};

     

      if (status) {
        where.status = status;
      }

      if (companyId) {
        where.companyId = companyId;
      }

      const tasks = await this.prisma.taskAssignment.findMany({
        where,
        include: {
          clientBusiness: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return tasks;
    } catch (error) {
      throw error;
    }
  }

  async getTaskById(id: string) {
    try {
      const task = await this.prisma.taskAssignment.findUnique({
        where: { id },
        include: {
          clientBusiness: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      return task;
    } catch (error) {
      throw error;
    }
  }

  async updateTask(
    id: string,
    updateTaskDto: UpdateTaskAssignmentDto,
    userId: string,
  ) {
    try {
      const existingTask = await this.prisma.taskAssignment.findUnique({
        where: { id },
      });

      if (!existingTask) {
        throw new NotFoundException('Task not found');
      }

      // No authorization check needed

      const updateData: any = { ...updateTaskDto };

      if (updateTaskDto.dueDate) {
        updateData.dueDate = new Date(updateTaskDto.dueDate);
      }

      const task = await this.prisma.taskAssignment.update({
        where: { id },
        data: updateData,
        include: {
          clientBusiness: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return task;
    } catch (error) {
      throw error;
    }
  }

  async deleteTask(id: string, userId: string) {
    try {
      const task = await this.prisma.taskAssignment.findUnique({
        where: { id },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // No authorization check needed

      await this.prisma.taskAssignment.delete({
        where: { id },
      });

      return { message: 'Task deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async getTasksByCompanyId(companyId: string) {
    try {
      const tasks = await this.prisma.taskAssignment.findMany({
        where: { companyId },
        include: {
          clientBusiness: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return tasks;
    } catch (error) {
      throw error;
    }
  }

  async getTasksByAssignee(assignToId: string) {
    try {
      const tasks = await this.prisma.taskAssignment.findMany({
        where: { assignToId },
        include: {
          clientBusiness: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      return tasks;
    } catch (error) {
      throw error;
    }
  }

  async getMyCreatedTasks(createdBy: string) {
    try {
      const tasks = await this.prisma.taskAssignment.findMany({
        where: { createdBy },
        include: {
          clientBusiness: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return tasks;
    } catch (error) {
      throw error;
    }
  }
}
