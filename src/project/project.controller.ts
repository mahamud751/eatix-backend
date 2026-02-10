import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { multerOptions } from '../../middleware/multer.config';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('upload-attachments')
  @UseInterceptors(FilesInterceptor('attachments', 10, multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload project attachments (images/PDFs)' })
  @ApiBody({
    description: 'Upload multiple attachments',
    schema: {
      type: 'object',
      properties: {
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Attachments uploaded successfully',
  })
  async uploadAttachments(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{
    files: Array<{ filename: string; path: string; url: string }>;
  }> {
    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      path: file.path,
      url: `/uploads/${file.filename}`,
    }));

    return { files: uploadedFiles };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
  })
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.projectService.findAll(userId, status, page, perPage);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all projects by user ID' })
  @ApiResponse({
    status: 200,
    description: 'User projects retrieved successfully',
  })
  async findByUser(@Param('userId') userId: string) {
    return this.projectService.findByUser(userId);
  }

  @Get('business/:businessId')
  @ApiOperation({ summary: 'Get all projects by business ID' })
  @ApiResponse({
    status: 200,
    description: 'Business projects retrieved successfully',
  })
  async findByBusiness(@Param('businessId') businessId: string) {
    return this.projectService.findByBusiness(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update project status' })
  @ApiResponse({
    status: 200,
    description: 'Project status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
  ) {
    return this.projectService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(@Param('id') id: string) {
    return this.projectService.remove(id);
  }
}
