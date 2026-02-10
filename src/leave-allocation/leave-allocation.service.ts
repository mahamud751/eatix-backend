import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveAllocationService {
  constructor(private prisma: PrismaService) {}

  // Create or update leave allocation for a user
  async createOrUpdateAllocation(userId: string, allocationData: any) {
    // Check if allocation already exists for this user
    const existingAllocation = await this.prisma.leaveAllocation.findUnique({
      where: { userId },
    });

    if (existingAllocation) {
      // Update existing allocation
      return this.prisma.leaveAllocation.update({
        where: { userId },
        data: {
          annualLeave:
            allocationData.annualLeave ?? existingAllocation.annualLeave,
          casualLeave:
            allocationData.casualLeave ?? existingAllocation.casualLeave,
          sickLeave: allocationData.sickLeave ?? existingAllocation.sickLeave,
          emergencyLeave:
            allocationData.emergencyLeave ?? existingAllocation.emergencyLeave,
          unpaidLeave:
            allocationData.unpaidLeave ?? existingAllocation.unpaidLeave,
          maternityLeave:
            allocationData.maternityLeave ?? existingAllocation.maternityLeave,
          paternityLeave:
            allocationData.paternityLeave ?? existingAllocation.paternityLeave,
        },
      });
    } else {
      // Create new allocation
      return this.prisma.leaveAllocation.create({
        data: {
          userId,
          annualLeave: allocationData.annualLeave ?? 14,
          casualLeave: allocationData.casualLeave ?? 10,
          sickLeave: allocationData.sickLeave ?? 10,
          emergencyLeave: allocationData.emergencyLeave ?? 0,
          unpaidLeave: allocationData.unpaidLeave ?? 0,
          maternityLeave: allocationData.maternityLeave ?? 0,
          paternityLeave: allocationData.paternityLeave ?? 0,
        },
      });
    }
  }

  // Get leave allocation for a user
  async getAllocation(userId: string) {
    const allocation = await this.prisma.leaveAllocation.findUnique({
      where: { userId },
    });

    if (!allocation) {
      // Create default allocation if it doesn't exist
      return this.createOrUpdateAllocation(userId, {});
    }

    return allocation;
  }

  // Update used leave days when a leave is approved
  async updateUsedLeave(
    userId: string,
    leaveType: string,
    days: number,
    isAdding: boolean = true,
  ) {
    const allocation = await this.getAllocation(userId);

    if (!allocation) {
      throw new Error(`No leave allocation found for user ${userId}`);
    }

    let updateData: any = {};

    switch (leaveType) {
      case 'annual':
        updateData.usedAnnualLeave = isAdding
          ? allocation.usedAnnualLeave + days
          : Math.max(0, allocation.usedAnnualLeave - days);
        break;
      case 'casual':
        updateData.usedCasualLeave = isAdding
          ? allocation.usedCasualLeave + days
          : Math.max(0, allocation.usedCasualLeave - days);
        break;
      case 'sick':
        updateData.usedSickLeave = isAdding
          ? allocation.usedSickLeave + days
          : Math.max(0, allocation.usedSickLeave - days);
        break;
      case 'emergency':
        updateData.usedEmergencyLeave = isAdding
          ? allocation.usedEmergencyLeave + days
          : Math.max(0, allocation.usedEmergencyLeave - days);
        break;
      case 'unpaid':
        updateData.usedUnpaidLeave = isAdding
          ? allocation.usedUnpaidLeave + days
          : Math.max(0, allocation.usedUnpaidLeave - days);
        break;
      case 'maternity':
        updateData.usedMaternityLeave = isAdding
          ? allocation.usedMaternityLeave + days
          : Math.max(0, allocation.usedMaternityLeave - days);
        break;
      case 'paternity':
        updateData.usedPaternityLeave = isAdding
          ? allocation.usedPaternityLeave + days
          : Math.max(0, allocation.usedPaternityLeave - days);
        break;
      default:
        throw new Error(`Unknown leave type: ${leaveType}`);
    }

    return this.prisma.leaveAllocation.update({
      where: { userId },
      data: updateData,
    });
  }

  // Get remaining leave for a user
  async getRemainingLeave(userId: string) {
    const allocation = await this.getAllocation(userId);

    if (!allocation) {
      return null;
    }

    return {
      annual: allocation.annualLeave - allocation.usedAnnualLeave,
      casual: allocation.casualLeave - allocation.usedCasualLeave,
      sick: allocation.sickLeave - allocation.usedSickLeave,
      emergency: allocation.emergencyLeave - allocation.usedEmergencyLeave,
      unpaid: allocation.unpaidLeave - allocation.usedUnpaidLeave,
      maternity: allocation.maternityLeave - allocation.usedMaternityLeave,
      paternity: allocation.paternityLeave - allocation.usedPaternityLeave,
    };
  }

  // Get all leave allocations
  async getAllAllocations() {
    return this.prisma.leaveAllocation.findMany({
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
  }
}
