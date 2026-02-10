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
import { EmployeeCategoryService } from './employee-category.service';
import { CreateEmployeeCategoryDto } from './dto/create-employee-category.dto';
import { UpdateEmployeeCategoryDto } from './dto/update-employee-category.dto';

@ApiTags('employee-category')
@Controller('employee-category')
export class EmployeeCategoryController {
  constructor(
    private readonly employeeCategoryService: EmployeeCategoryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new employee category' })
  @ApiResponse({
    status: 201,
    description: 'Employee category created successfully',
  })
  create(@Body() createEmployeeCategoryDto: CreateEmployeeCategoryDto) {
    return this.employeeCategoryService.create(createEmployeeCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employee categories' })
  @ApiResponse({
    status: 200,
    description: 'Employee categories retrieved successfully',
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 25,
  ) {
    return this.employeeCategoryService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee category retrieved successfully',
  })
  findOne(@Param('id') id: string) {
    return this.employeeCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee category' })
  @ApiResponse({
    status: 200,
    description: 'Employee category updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeCategoryDto: UpdateEmployeeCategoryDto,
  ) {
    return this.employeeCategoryService.update(id, updateEmployeeCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee category' })
  @ApiResponse({
    status: 200,
    description: 'Employee category deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.employeeCategoryService.remove(id);
  }
}
