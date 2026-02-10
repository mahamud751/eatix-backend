import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ScheduledContentService } from './scheduled-content.service';
import {
  CreateScheduledContentDto,
  UpdateScheduledContentDto,
} from './dto/scheduled-content.dto';

@ApiTags('Scheduled Content')
@Controller('scheduled-content')
export class ScheduledContentController {
  constructor(
    private readonly scheduledContentService: ScheduledContentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new scheduled content' })
  @ApiResponse({ status: 201, description: 'Scheduled content created' })
  create(@Body() createDto: CreateScheduledContentDto) {
    return this.scheduledContentService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all scheduled content' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of scheduled content' })
  findAll(
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    if (userId) {
      return this.scheduledContentService.findByUserId(userId);
    }
    if (companyId) {
      return this.scheduledContentService.findByCompanyId(companyId);
    }
    if (status) {
      return this.scheduledContentService.findByStatus(status);
    }
    return this.scheduledContentService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get scheduled content statistics' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'Statistics' })
  getStats(@Query('userId') userId?: string) {
    return this.scheduledContentService.getStats(userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled content (next 7 days)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'Upcoming scheduled content' })
  getUpcoming(@Query('userId') userId?: string) {
    return this.scheduledContentService.getUpcoming(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scheduled content by ID' })
  @ApiResponse({ status: 200, description: 'Scheduled content details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.scheduledContentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update scheduled content' })
  @ApiResponse({ status: 200, description: 'Scheduled content updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateScheduledContentDto,
  ) {
    return this.scheduledContentService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete scheduled content' })
  @ApiResponse({ status: 200, description: 'Scheduled content deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.scheduledContentService.remove(id);
  }
}
