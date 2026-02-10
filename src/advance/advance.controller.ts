import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdvanceService } from './advance.service';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceDto } from './dto/update-advance.dto';
import { multerOptions } from '../../middleware/multer.config';
import { Advance } from '@prisma/client';

@ApiTags('Advance Products')
@Controller('advance')
export class AdvanceController {
  constructor(private readonly advanceService: AdvanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new advance product' })
  @ApiBody({ type: CreateAdvanceDto })
  @ApiResponse({
    status: 201,
    description: 'The advance product has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async create(
    @Body() createAdvanceDto: CreateAdvanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      createAdvanceDto.files = [
        {
          title: file.originalname,
          src: `/uploads/${file.filename}`,
          srcHash: '',
          id: undefined,
        },
      ];
    }

    if (createAdvanceDto.files) {
      for (const fileDetail of createAdvanceDto.files) {
        if (fileDetail.src.startsWith('data:')) {
          const matches = fileDetail.src.match(/^data:(.+);base64,(.+)$/);
          if (!matches) {
            throw new BadRequestException('Invalid Base64 string');
          }

          const fileType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = `${uuidv4()}.${fileType.split('/')[1]}`;
          const filePath = join('public', 'uploads', filename);

          await writeFile(filePath, buffer);
          fileDetail.src = `/${filename}`;
        }
      }
    }

    return this.advanceService.create(createAdvanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all advance products' })
  @ApiResponse({ status: 200, description: 'Return all advance products' })
  @ApiResponse({ status: 404, description: 'No advance products found' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 25,
  ) {
    return this.advanceService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an advance product by ID' })
  @ApiParam({ name: 'id', description: 'ID of the advance product' })
  @ApiResponse({ status: 200, description: 'Return an advance product by ID' })
  @ApiResponse({ status: 404, description: 'Advance product not found' })
  findOne(@Param('id') id: string) {
    return this.advanceService.findOne(id);
  }

  @Get(':id/demos')
  @ApiOperation({ summary: 'Get all demos for a specific advance product' })
  @ApiParam({ name: 'id', description: 'ID of the advance product' })
  @ApiResponse({
    status: 200,
    description: 'Return all demos for the advance product',
  })
  @ApiResponse({ status: 404, description: 'Advance product not found' })
  async getAdvanceDemos(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.advanceService.getAdvanceDemos(id, page, perPage);
  }

  @Get(':id/myAdvance')
  @ApiOperation({
    summary: 'Get advance products assigned to a specific vendor (user)',
  })
  @ApiParam({ name: 'id', description: 'ID of the vendor (user)' })
  @ApiResponse({
    status: 200,
    description: 'Return advance products assigned to the vendor',
  })
  @ApiResponse({ status: 404, description: 'Vendor or products not found' })
  async getMyAdvanceProduct(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 25,
  ) {
    return this.advanceService.getAdvanceProductsByVendorId(id, page, perPage);
  }

  @Get(':id/myAdvance/:advanceId')
  @ApiOperation({
    summary:
      'Get a single advance product assigned to a specific vendor (user)',
  })
  @ApiParam({ name: 'id', description: 'ID of the vendor (user)' })
  @ApiParam({ name: 'advanceId', description: 'ID of the advance product' })
  @ApiResponse({
    status: 200,
    description: 'Return a single advance product assigned to the vendor',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor or advance product not found',
  })
  async getMyAdvanceProductDemo(
    @Param('id') id: string,
    @Param('advanceId') advanceId: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 25,
  ) {
    return this.advanceService.getAdvanceProductsByVendorIdDemo(
      id,
      advanceId,
      page,
      perPage,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an advance product by ID' })
  @ApiParam({ name: 'id', description: 'ID of the advance product to delete' })
  @ApiResponse({
    status: 200,
    description: 'The advance product has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Advance product not found' })
  remove(@Param('id') id: string) {
    return this.advanceService.remove(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an advance product by ID' })
  @ApiParam({ name: 'id', description: 'ID of the advance product' })
  @ApiBody({ type: UpdateAdvanceDto })
  @ApiResponse({
    status: 200,
    description: 'The advance product has been successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Advance product not found' })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async update(
    @Param('id') id: string,
    @Body() updateAdvanceDto: UpdateAdvanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      updateAdvanceDto.files = [
        {
          title: file.originalname,
          src: `/uploads/${file.filename}`,
          srcHash: '',
          id: undefined,
        },
      ];
    }

    if (updateAdvanceDto.files) {
      for (const fileDetail of updateAdvanceDto.files) {
        if (fileDetail.src.startsWith('data:')) {
          const matches = fileDetail.src.match(/^data:(.+);base64,(.+)$/);
          if (!matches) {
            throw new BadRequestException('Invalid Base64 string');
          }

          const fileType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = `${uuidv4()}.${fileType.split('/')[1]}`;
          const filePath = join('public', 'uploads', filename);

          await writeFile(filePath, buffer);
          fileDetail.src = `/${filename}`;
        }
      }
    }

    return this.advanceService.update(id, updateAdvanceDto);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign vendors to an advance by ID' })
  @ApiParam({ name: 'id', description: 'ID of the advance to update' })
  @ApiResponse({ status: 200, description: 'The updated advance' })
  @ApiResponse({ status: 404, description: 'Advance not found' })
  async assignVendorToAdvance(
    @Param('id') id: string,
    @Body() updateAdvanceDto: UpdateAdvanceDto,
  ) {
    return this.advanceService.assignVendorToAdvance(id, updateAdvanceDto);
  }

  @Patch(':id/updateIsDemoPublished')
  @ApiOperation({
    summary:
      'Update the isDemoPublished status of a demo within an advance product',
  })
  @ApiParam({ name: 'id', description: 'ID of the advance product' })
  @ApiBody({
    description: 'Payload containing demoId and isDemoPublished status',
  })
  @ApiResponse({
    status: 200,
    description: 'The advance product has been successfully updated',
  })
  @ApiResponse({
    status: 404,
    description: 'Advance product or demo not found',
  })
  updateDemoStatus(
    @Param('id') id: string,
    @Body() body: { demoId: string; isDemoPublished: boolean },
  ) {
    const { demoId, isDemoPublished } = body;
    return this.advanceService.updateDemoStatus(id, demoId, isDemoPublished);
  }
}
