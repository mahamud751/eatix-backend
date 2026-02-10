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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { DynamicService } from './dynamic.service';
import { CreateDynamicDto } from './dto/create-dynamic.dto';
import { UpdateDynamicDto } from './dto/update-dynamic.dto';

@ApiTags('dynamics')
@Controller('dynamics')
export class DynamicController {
  constructor(private readonly dynamicService: DynamicService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dynamic' })
  @ApiResponse({
    status: 201,
    description: 'The dynamic has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() CreateDynamicDto: CreateDynamicDto) {
    return this.dynamicService.create(CreateDynamicDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all dynamics' })
  @ApiResponse({ status: 200, description: 'Return all dynamics.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.dynamicService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dynamic by id' })
  @ApiParam({ name: 'id', description: 'ID of the dynamic to retrieve' })
  @ApiQuery({
    name: 'subdynamic',
    required: false,
    description: 'Subdynamic ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the dynamic.' })
  @ApiResponse({ status: 404, description: 'dynamic not found.' })
  findOne(@Param('id') id: string) {
    return this.dynamicService.findOne(id);
  }

  @Get(':id/user')
  @ApiOperation({ summary: 'Get a dynamic for user by id' })
  @ApiParam({ name: 'id', description: 'ID of the dynamic to retrieve' })
  @ApiQuery({
    name: 'subdynamic',
    required: false,
    description: 'Subdynamic ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the dynamic for user.' })
  @ApiResponse({ status: 404, description: 'Dynamic not found.' })
  findOneForUser(@Param('id') id: string) {
    return this.dynamicService.findOne(id); // Use findOne instead
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a dynamic' })
  @ApiParam({ name: 'id', description: 'ID of the dynamic to update' })
  @ApiBody({ type: UpdateDynamicDto })
  @ApiResponse({
    status: 200,
    description: 'The dynamic has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'dynamic not found.' })
  update(@Param('id') id: string, @Body() UpdateDynamicDto: UpdateDynamicDto) {
    return this.dynamicService.update(id, UpdateDynamicDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a dynamic' })
  @ApiParam({ name: 'id', description: 'ID of the dynamic to delete' })
  @ApiResponse({
    status: 200,
    description: 'The dynamic has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'dynamic not found.' })
  remove(@Param('id') id: string) {
    return this.dynamicService.remove(id);
  }
}
