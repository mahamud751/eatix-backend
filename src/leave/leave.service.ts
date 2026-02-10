import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto, LeaveType, LeaveStatus } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { LeaveAllocationService } from '../leave-allocation/leave-allocation.service';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private leaveAllocationService: LeaveAllocationService,
  ) {}

  async create(createLeaveDto: CreateLeaveDto) {
    const { userId, fromDate, toDate, leaveType, reason, attachment } =
      createLeaveDto;

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Parse dates
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Validate dates
    if (to < from) {
      throw new BadRequestException('To date must be after from date');
    }

    // Calculate total days
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end day

    // Create leave request
    const leave = await this.prisma.leave.create({
      data: {
        userId,
        leaveType,
        fromDate: from,
        toDate: to,
        totalDays,
        reason: reason || null,
        attachment: attachment || null,
        status: LeaveStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    return leave;
  }

  async findAll(
    userId?: string,
    status?: LeaveStatus,
    leaveType?: LeaveType,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    perPage: number = 100,
  ) {
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    if (startDate || endDate) {
      where.fromDate = {};
      if (startDate) {
        where.fromDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.fromDate.lte = new Date(endDate);
      }
    }

    const [leaves, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: perPage,
      }),
      this.prisma.leave.count({ where }),
    ]);

    return {
      data: leaves,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    const leave = await this.prisma.leave.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            department: true,
          },
        },
      },
    });

    if (!leave) {
      throw new NotFoundException(`Leave with ID ${id} not found`);
    }

    return leave;
  }

  async findByUser(userId: string, startDate?: string, endDate?: string) {
    const where: any = { userId };

    if (startDate || endDate) {
      where.fromDate = {};
      if (startDate) {
        where.fromDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.fromDate.lte = new Date(endDate);
      }
    }

    const leaves = await this.prisma.leave.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    return leaves;
  }

  async update(id: string, updateLeaveDto: UpdateLeaveDto) {
    // Check if leave exists
    await this.findOne(id);

    const updateData: any = {};

    if (updateLeaveDto.leaveType !== undefined) {
      updateData.leaveType = updateLeaveDto.leaveType;
    }
    if (updateLeaveDto.fromDate !== undefined) {
      updateData.fromDate = new Date(updateLeaveDto.fromDate);
    }
    if (updateLeaveDto.toDate !== undefined) {
      updateData.toDate = new Date(updateLeaveDto.toDate);
    }
    if (updateLeaveDto.reason !== undefined) {
      updateData.reason = updateLeaveDto.reason;
    }
    if (updateLeaveDto.attachment !== undefined) {
      updateData.attachment = updateLeaveDto.attachment;
    }
    if (updateLeaveDto.status !== undefined) {
      updateData.status = updateLeaveDto.status;
    }
    if (updateLeaveDto.approvedBy !== undefined) {
      updateData.approvedBy = updateLeaveDto.approvedBy;
    }
    if (updateLeaveDto.approvedAt !== undefined) {
      updateData.approvedAt = new Date(updateLeaveDto.approvedAt);
    }
    if (updateLeaveDto.rejectedBy !== undefined) {
      updateData.rejectedBy = updateLeaveDto.rejectedBy;
    }
    if (updateLeaveDto.rejectedAt !== undefined) {
      updateData.rejectedAt = new Date(updateLeaveDto.rejectedAt);
    }
    if (updateLeaveDto.rejectionReason !== undefined) {
      updateData.rejectionReason = updateLeaveDto.rejectionReason;
    }

    // Recalculate total days if dates changed
    if (updateData.fromDate || updateData.toDate) {
      const leave = await this.prisma.leave.findUnique({ where: { id } });
      const from = updateData.fromDate || leave.fromDate;
      const to = updateData.toDate || leave.toDate;

      const diffTime = Math.abs(to.getTime() - from.getTime());
      updateData.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    return updatedLeave;
  }

  async approve(id: string, approvedBy: string) {
    const leave = await this.findOne(id);

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update leave allocation when leave is approved
    if (updatedLeave.status === LeaveStatus.APPROVED) {
      await this.leaveAllocationService.updateUsedLeave(
        updatedLeave.userId,
        updatedLeave.leaveType,
        updatedLeave.totalDays,
        true, // Adding to used leave
      );
    }

    return updatedLeave;
  }

  async reject(id: string, rejectedBy: string, rejectionReason?: string) {
    const leave = await this.findOne(id);

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If the leave was previously approved, reduce the used leave
    if (leave.status === LeaveStatus.APPROVED) {
      await this.leaveAllocationService.updateUsedLeave(
        updatedLeave.userId,
        updatedLeave.leaveType,
        updatedLeave.totalDays,
        false, // Removing from used leave
      );
    }

    return updatedLeave;
  }

  async cancel(id: string) {
    const leave = await this.findOne(id);

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
      },
    });

    // If the leave was approved, reduce the used leave
    if (leave.status === LeaveStatus.APPROVED) {
      await this.leaveAllocationService.updateUsedLeave(
        leave.userId,
        leave.leaveType,
        leave.totalDays,
        false, // Removing from used leave
      );
    }

    return updatedLeave;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.leave.delete({
      where: { id },
    });

    return { message: 'Leave deleted successfully' };
  }

  async getRemainingLeave(userId: string) {
    return this.leaveAllocationService.getRemainingLeave(userId);
  }

  async getStats(userId?: string, startDate?: string, endDate?: string) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.fromDate = {};
      if (startDate) {
        where.fromDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.fromDate.lte = new Date(endDate);
      }
    }

    const [total, pending, approved, rejected, cancelled, byType] =
      await Promise.all([
        this.prisma.leave.count({ where }),
        this.prisma.leave.count({
          where: { ...where, status: LeaveStatus.PENDING },
        }),
        this.prisma.leave.count({
          where: { ...where, status: LeaveStatus.APPROVED },
        }),
        this.prisma.leave.count({
          where: { ...where, status: LeaveStatus.REJECTED },
        }),
        this.prisma.leave.count({
          where: { ...where, status: LeaveStatus.CANCELLED },
        }),
        this.prisma.leave.groupBy({
          by: ['leaveType'],
          where,
          _count: true,
          _sum: {
            totalDays: true,
          },
        }),
      ]);

    return {
      total,
      byStatus: {
        pending,
        approved,
        rejected,
        cancelled,
      },
      byType: byType.map((item) => ({
        type: item.leaveType,
        count: item._count,
        totalDays: item._sum.totalDays || 0,
      })),
    };
  }
}
