import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/AdminRoleGuard';
import { CurrentUser } from '../users/dto/currentUser';

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a video or short (logged-in user)' })
  @ApiResponse({ status: 201, description: 'Report submitted' })
  async create(
    @CurrentUser() user: { id: string },
    @Body('contentType') contentType: 'video' | 'short',
    @Body('contentId') contentId: string,
    @Body('reason') reason?: string,
    @Body('details') details?: string,
  ) {
    if (!contentType || !contentId || !reason) {
      throw new BadRequestException('contentType, contentId, and reason are required');
    }
    return this.reportService.create({
      contentType,
      contentId,
      reporterId: user.id,
      reason,
      details,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all content reports (admin): who reported, what, reason',
  })
  @ApiResponse({ status: 200, description: 'Paginated reports' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportService.listForAdmin({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
