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
import { BlogCommentService } from './blogComment.service';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import { UpdateBlogCommentDto } from './dto/update-blog-comment.dto';

@ApiTags('BlogComments')
@Controller('blogComments')
export class BlogCommentController {
  constructor(private readonly blogCommentService: BlogCommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new blog comment' })
  @ApiResponse({
    status: 201,
    description: 'The blog comment has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() createBlogCommentDto: CreateBlogCommentDto) {
    return this.blogCommentService.create(createBlogCommentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all blog comments' })
  @ApiResponse({ status: 200, description: 'List of blog comments' })
  findAll() {
    return this.blogCommentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a blog comment by ID' })
  @ApiParam({ name: 'id', description: 'ID of the blog comment to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'The blog comment with the given ID',
  })
  @ApiResponse({ status: 404, description: 'Blog comment not found' })
  findOne(@Param('id') id: string) {
    return this.blogCommentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a blog comment by ID' })
  @ApiParam({ name: 'id', description: 'ID of the blog comment to update' })
  @ApiResponse({ status: 200, description: 'The updated blog comment' })
  @ApiResponse({ status: 404, description: 'Blog comment not found' })
  update(
    @Param('id') id: string,
    @Body() updateBlogCommentDto: UpdateBlogCommentDto,
  ) {
    return this.blogCommentService.update(id, updateBlogCommentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog comment by ID' })
  @ApiParam({ name: 'id', description: 'ID of the blog comment to delete' })
  @ApiResponse({ status: 200, description: 'The deleted blog comment' })
  @ApiResponse({ status: 404, description: 'Blog comment not found' })
  remove(@Param('id') id: string) {
    return this.blogCommentService.remove(id);
  }
}
