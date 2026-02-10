import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    entityId: string,
    entityType: string,
    action: string,
    oldValue: any, // Adjust type according to your needs
    newValue: any, // Adjust type according to your needs
  ) {
    await this.prisma.auditLog.create({
      data: {
        entityId,
        entityType,
        action,
        oldValue: oldValue ? oldValue : null, // Ensure null handling
        newValue: newValue ? newValue : null, // Ensure null handling
      },
    });
  }

  async getLogs(
    entityId?: string,
    entityType?: string,
    action?: string,
    startDate?: Date,
    endDate?: Date,
    skip?: number,
    take?: number,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entityId && { entityId }),
        ...(entityType && { entityType }),
        ...(action && { action }),
        ...(startDate &&
          endDate && {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    });
  }
}
