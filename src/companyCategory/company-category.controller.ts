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
import { CompanyCategoryService } from './company-category.service';
import { CreateCompanyCategoryDto } from './dto/create-company-category.dto';
import { UpdateCompanyCategoryDto } from './dto/update-company-category.dto';

@ApiTags('company-category')
@Controller('company-category')
export class CompanyCategoryController {
  constructor(
    private readonly companyCategoryService: CompanyCategoryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company category' })
  @ApiResponse({
    status: 201,
    description: 'Company category created successfully',
  })
  create(@Body() createCompanyCategoryDto: CreateCompanyCategoryDto) {
    return this.companyCategoryService.create(createCompanyCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all company categories' })
  @ApiResponse({
    status: 200,
    description: 'Company categories retrieved successfully',
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 25,
  ) {
    return this.companyCategoryService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Company category retrieved successfully',
  })
  findOne(@Param('id') id: string) {
    return this.companyCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company category' })
  @ApiResponse({
    status: 200,
    description: 'Company category updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() updateCompanyCategoryDto: UpdateCompanyCategoryDto,
  ) {
    return this.companyCategoryService.update(id, updateCompanyCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company category' })
  @ApiResponse({
    status: 200,
    description: 'Company category deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.companyCategoryService.remove(id);
  }
}
