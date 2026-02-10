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
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ContentManagementService } from './content-management.service';
import {
  CreateContentDto,
  UpdateContentDto,
} from '../dto/content-management.dto';
import { multerOptions } from '../../middleware/multer.config';

@ApiTags('content-management')
@Controller('content-management')
export class ContentManagementController {
  constructor(
    private readonly contentManagementService: ContentManagementService,
  ) {}

  // ============================================
  // FILE UPLOAD
  // ============================================
  @Post('upload-files')
  @UseInterceptors(FilesInterceptor('files', 50, multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload content files' })
  @ApiBody({
    description: 'Upload multiple files',
    schema: {
      type: 'object',
      properties: {
        files: {
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
    description: 'Files uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<{
    files: Array<{ filename: string; url: string }>;
  }> {
    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
    }));

    return { files: uploadedFiles };
  }

  // ============================================
  // CREATE CONTENT
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Create new content' })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  async create(@Body() createContentDto: CreateContentDto) {
    return this.contentManagementService.create(createContentDto);
  }

  // ============================================
  // GET ALL CONTENTS
  // ============================================
  @Get()
  @ApiOperation({ summary: 'Get all contents' })
  @ApiResponse({ status: 200, description: 'Return all contents' })
  async findAll() {
    return this.contentManagementService.findAll();
  }

  // ============================================
  // GET CONTENT BY USER ID
  // ============================================
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get contents by user ID' })
  @ApiResponse({ status: 200, description: 'Return contents for user' })
  async findByUserId(@Param('userId') userId: string) {
    return this.contentManagementService.findByUserId(userId);
  }

  // ============================================
  // GET SINGLE CONTENT
  // ============================================
  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiResponse({ status: 200, description: 'Return content' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async findOne(@Param('id') id: string) {
    return this.contentManagementService.findOne(id);
  }

  // ============================================
  // UPDATE CONTENT
  // ============================================
  @Patch(':id')
  @ApiOperation({ summary: 'Update content' })
  @ApiResponse({ status: 200, description: 'Content updated successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async update(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.contentManagementService.update(id, updateContentDto);
  }

  // ============================================
  // DELETE CONTENT
  // ============================================
  @Delete(':id')
  @ApiOperation({ summary: 'Delete content' })
  @ApiResponse({ status: 200, description: 'Content deleted successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async remove(@Param('id') id: string) {
    return this.contentManagementService.remove(id);
  }

  // ============================================
  // ADDITIONAL FILTERED QUERIES
  // ============================================
  @Get('status/:status')
  @ApiOperation({ summary: 'Get contents by status' })
  @ApiResponse({ status: 200, description: 'Return contents by status' })
  async findByStatus(@Param('status') status: string) {
    return this.contentManagementService.findByStatus(status);
  }

  @Get('role/:role')
  @ApiOperation({ summary: 'Get contents by role' })
  @ApiResponse({ status: 200, description: 'Return contents by role' })
  async findByRole(@Param('role') role: string) {
    return this.contentManagementService.findByRole(role);
  }

  @Get('role/:role/status/:status')
  @ApiOperation({ summary: 'Get contents by role and status' })
  @ApiResponse({
    status: 200,
    description: 'Return contents by role and status',
  })
  async findByRoleAndStatus(
    @Param('role') role: string,
    @Param('status') status: string,
  ) {
    return this.contentManagementService.findByRoleAndStatus(role, status);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get contents by company ID' })
  @ApiResponse({ status: 200, description: 'Return contents for company' })
  async findByCompany(@Param('companyId') companyId: string) {
    return this.contentManagementService.findByCompany(companyId);
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get contents by date range' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Return contents in date range' })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.contentManagementService.findByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ============================================
  // CLIENT-WISE CONTENT ENDPOINT
  // ============================================
  @Get('client/:companyId/client/:clientId')
  @ApiOperation({ summary: 'Get contents by company ID and client ID' })
  @ApiResponse({
    status: 200,
    description: 'Return contents for specific company and client',
  })
  @ApiResponse({ status: 404, description: 'No contents found' })
  async findByCompanyAndClient(
    @Param('companyId') companyId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.contentManagementService.findByCompanyAndUser(
      companyId,
      clientId,
    );
  }

  // ============================================
  // EMPLOYEE ASSIGNED CONTENT ENDPOINT
  // ============================================
  @Get('assigned/:assignId')
  @ApiOperation({ summary: 'Get contents assigned to employee' })
  @ApiResponse({
    status: 200,
    description: 'Return contents assigned to specific employee',
  })
  @ApiResponse({ status: 404, description: 'No contents found' })
  async findByAssignId(@Param('assignId') assignId: string) {
    return this.contentManagementService.findByAssignId(assignId);
  }
}
