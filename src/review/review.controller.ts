import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: 201,
    description: 'The review has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Validation failed.' })
  async createReview(@Body() reviewData: CreateReviewDto) {
    return this.reviewService.createReview(reviewData);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all reviews with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default is 1)',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Number of reviews per page (default is 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all reviews with pagination.',
  })
  async getAllReviews(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.reviewService.getAllReviews(page, perPage);
  }

  @Get('/user')
  @ApiOperation({ summary: 'Get reviews by user email' })
  @ApiQuery({ name: 'email', description: 'Email of the user', required: true })
  @ApiResponse({
    status: 200,
    description: 'Return reviews by a specific user.',
  })
  @ApiResponse({
    status: 404,
    description: 'No reviews found for the specified user.',
  })
  async getReviewsByUser(@Query('email') email: string) {
    return this.reviewService.getReviewsByUser(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by id' })
  @ApiParam({ name: 'id', description: 'ID of the review to retrieve' })
  @ApiResponse({ status: 200, description: 'Return the review.' })
  @ApiResponse({ status: 404, description: 'review not found.' })
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Patch(':id/reply')
  @ApiOperation({ summary: 'Reply to a specific review' })
  @ApiParam({
    name: 'id',
    description: 'ID of the review to reply to',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Reply added to the review.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  async replyToReview(
    @Param('id') id: string,
    @Body() { body, userName }: { body: string; userName: string },
  ) {
    return this.reviewService.replyToReview(id, body, userName);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({
    name: 'id',
    description: 'ID of the review to delete',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The review has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  async deleteReview(@Param('id') id: string) {
    return this.reviewService.deleteReview(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing review' })
  @ApiParam({
    name: 'id',
    description: 'ID of the review to update',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The review has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Validation failed.' })
  async updateReview(@Param('id') id: string, @Body() data: UpdateReviewDto) {
    return this.reviewService.updateReview(id, data);
  }
}
