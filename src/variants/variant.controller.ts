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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@ApiTags('variants')
@Controller('variants')
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new variant' })
  @ApiResponse({
    status: 201,
    description: 'The variant has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() createVariantDto: CreateVariantDto) {
    return this.variantService.create(createVariantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all variants' })
  @ApiResponse({ status: 200, description: 'Returns a list of all variants.' })
  @ApiResponse({ status: 404, description: 'No variants found.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.variantService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a variant by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the variant with the specified ID.',
  })
  @ApiResponse({ status: 404, description: 'Variant not found.' })
  findOne(@Param('id') id: string) {
    return this.variantService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a variant by ID' })
  @ApiResponse({
    status: 200,
    description: 'The variant has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Variant not found.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  update(@Param('id') id: string, @Body() updateVariantDto: UpdateVariantDto) {
    return this.variantService.update(id, updateVariantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a variant by ID' })
  @ApiResponse({
    status: 200,
    description: 'The variant has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Variant not found.' })
  remove(@Param('id') id: string) {
    return this.variantService.remove(id);
  }
}
