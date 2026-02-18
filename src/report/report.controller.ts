import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportService } from './report.service';

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({ summary: 'Report content (video or short)' })
  @ApiResponse({ status: 201, description: 'Report submitted' })
  async create(
    @Body('contentType') contentType: 'video' | 'short',
    @Body('contentId') contentId: string,
    @Body('reporterId') reporterId?: string,
    @Body('reason') reason?: string,
    @Body('details') details?: string,
  ) {
    if (!contentType || !contentId || !reason) {
      throw new BadRequestException('contentType, contentId, and reason are required');
    }
    return this.reportService.create({
      contentType,
      contentId,
      reporterId,
      reason,
      details,
    });
  }
}
