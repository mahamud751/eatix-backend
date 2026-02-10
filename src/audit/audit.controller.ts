import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getAuditLogs(
    @Query('entityId') entityId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string, // Query parameters are strings by default
    @Query('take') take?: string, // Convert to number
  ) {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    return this.auditLogService.getLogs(
      entityId,
      entityType,
      action,
      parsedStartDate,
      parsedEndDate,
      Number(skip) || undefined, // Convert to number and handle invalid values
      Number(take) || undefined, // Convert to number and handle invalid values
    );
  }
}
