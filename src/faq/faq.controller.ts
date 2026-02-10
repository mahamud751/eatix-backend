import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqService } from './faq.service';

@ApiTags('Faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new faq comment' })
  @ApiResponse({
    status: 201,
    description: 'The faq comment has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() CreateFaqDto: CreateFaqDto) {
    return this.faqService.create(CreateFaqDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all faq' })
  @ApiResponse({ status: 200, description: 'Return all faq.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.faqService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a faq comment by ID' })
  @ApiParam({ name: 'id', description: 'ID of the faq comment to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'The faq comment with the given ID',
  })
  @ApiResponse({ status: 404, description: 'Faq comment not found' })
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a faq comment by ID' })
  @ApiParam({ name: 'id', description: 'ID of the faq comment to update' })
  @ApiResponse({ status: 200, description: 'The updated faq comment' })
  @ApiResponse({ status: 404, description: 'Faq comment not found' })
  update(@Param('id') id: string, @Body() UpdateFaqDto: UpdateFaqDto) {
    return this.faqService.update(id, UpdateFaqDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a faq comment by ID' })
  @ApiParam({ name: 'id', description: 'ID of the faq comment to delete' })
  @ApiResponse({ status: 200, description: 'The deleted faq comment' })
  @ApiResponse({ status: 404, description: 'Faq comment not found' })
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}
