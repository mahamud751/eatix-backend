import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DemoService } from './demo.service';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';

@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new demo' })
  @ApiResponse({
    status: 201,
    description: 'The demo has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() createDemoDto: CreateDemoDto) {
    return this.demoService.create(createDemoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all demos' })
  @ApiResponse({ status: 200, description: 'List of demos' })
  findAll() {
    return this.demoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a demo by ID' })
  @ApiParam({ name: 'id', description: 'ID of the demo to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'The demo with the given ID',
  })
  @ApiResponse({ status: 404, description: 'Demo not found' })
  findOne(@Param('id') id: string) {
    return this.demoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a demo by ID' })
  @ApiParam({ name: 'id', description: 'ID of the demo to update' })
  @ApiResponse({ status: 200, description: 'The updated demo' })
  @ApiResponse({ status: 404, description: 'Demo not found' })
  update(@Param('id') id: string, @Body() updateDemoDto: UpdateDemoDto) {
    return this.demoService.update(id, updateDemoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a demo by ID' })
  @ApiParam({ name: 'id', description: 'ID of the demo to delete' })
  @ApiResponse({ status: 200, description: 'The deleted demo' })
  @ApiResponse({ status: 404, description: 'Demo not found' })
  remove(@Param('id') id: string) {
    return this.demoService.remove(id);
  }
}
