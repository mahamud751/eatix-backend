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
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { multerOptions } from '../../middleware/multer.config';

@ApiTags('business')
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post('upload-attachments')
  @UseInterceptors(FilesInterceptor('attachments', 10, multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload business attachments (images/PDFs)' })
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
  @ApiOperation({ summary: 'Create a new business' })
  @ApiResponse({
    status: 201,
    description: 'Business created successfully',
  })
  async create(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.create(createBusinessDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all businesses with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Businesses retrieved successfully',
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('createdBy') createdBy?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.businessService.findAll(
      userId,
      createdBy,
      status,
      page,
      perPage,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all businesses by user ID' })
  @ApiResponse({
    status: 200,
    description: 'User businesses retrieved successfully',
  })
  async findByUser(@Param('userId') userId: string) {
    return this.businessService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business by ID' })
  @ApiResponse({
    status: 200,
    description: 'Business retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update business' })
  @ApiResponse({
    status: 200,
    description: 'Business updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.businessService.update(id, updateBusinessDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update business status' })
  @ApiResponse({
    status: 200,
    description: 'Business status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateBusinessStatusDto,
  ) {
    return this.businessService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete business' })
  @ApiResponse({
    status: 200,
    description: 'Business deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async remove(@Param('id') id: string) {
    return this.businessService.remove(id);
  }
}
