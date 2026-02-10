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
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new blog' })
  @ApiResponse({
    status: 201,
    description: 'The blog has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() createBlogDto: CreateBlogDto) {
    return this.blogService.create(createBlogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all blogs' })
  @ApiResponse({ status: 200, description: 'List of blogs' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.blogService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a blog by ID' })
  @ApiParam({ name: 'id', description: 'ID of the blog to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'The blog with the given ID',
  })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a blog by ID' })
  @ApiParam({ name: 'id', description: 'ID of the blog to update' })
  @ApiResponse({ status: 200, description: 'The updated blog' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
    return this.blogService.update(id, updateBlogDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog by ID' })
  @ApiParam({ name: 'id', description: 'ID of the blog to delete' })
  @ApiResponse({ status: 200, description: 'The deleted blog' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
