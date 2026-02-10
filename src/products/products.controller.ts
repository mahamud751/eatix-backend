import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginatedResult } from './type';
import { Product } from '@prisma/client';
import { UsersService } from 'src/users/users.service';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly userService: UsersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'The product has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Return all products.' })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
    @Request() req,
    @Query('limit') limit?: number,
    @Query('flashsale') flashsale?: string,
    @Query('email') email?: string,
    @Query('name') name?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<PaginatedResult<Product>> {
    return this.productService.findAll(
      page,
      perPage,
      limit,
      flashsale,
      email,
      name,
      categoryId,
    );
  }

  @Get('/recentVisit')
  @ApiOperation({ summary: 'Get recently visited products' })
  @ApiResponse({
    status: 200,
    description: 'Return recently visited products.',
  })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async findRecentlyVisited(
    @Query('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ): Promise<PaginatedResult<Product>> {
    return this.productService.findRecentlyVisited(userId, page, perPage);
  }

  @Get('/popular')
  @ApiOperation({ summary: 'Get paginated popular products based on views' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated popular products.',
  })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async findPopular(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ): Promise<PaginatedResult<Product>> {
    const maxPerPage = 15;
    const validPerPage = Math.min(Number(perPage), maxPerPage);

    return this.productService.findPopular(page, validPerPage);
  }

  @Get('/latest')
  @ApiOperation({ summary: 'Get paginated latest products' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated latest products.',
  })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async findLatest(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ): Promise<PaginatedResult<Product>> {
    const maxPerPage = 20;
    const validPerPage = Math.min(Number(perPage), maxPerPage);

    return this.productService.findLatest(page, validPerPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Return the product by ID.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    const product = await this.productService.findOne(id, userId, status);

    return product;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @Post('update-statuses')
  async updateStatuses() {
    await this.productService.updateStatuses();
    return { message: 'Statuses updated successfully' };
  }
}
