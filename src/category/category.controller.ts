import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FilterProductDto } from './dto/fIlter-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'The category has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Return all categories.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.categoryService.findAll(page, perPage);
  }

  @Get('otapi')
  @ApiOperation({ summary: 'Get categories from OTAPI' })
  @ApiResponse({ status: 200, description: 'OTAPI categories retrieved' })
  async getOtapiCategories() {
    return this.categoryService.getCategoriesFromOtapi();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get brands from OTAPI' })
  @ApiResponse({ status: 200, description: 'OTAPI brands retrieved' })
  async getOtapiBrands() {
    return this.categoryService.getBrandsFromOtapi();
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get 16 trending items from OTAPI' })
  @ApiResponse({
    status: 200,
    description: '16 trending items retrieved from OTAPI',
  })
  async getTrendingItems() {
    return this.categoryService.getTrendingItemsFromOtapi();
  }

  @Get('otapi-details')
  @ApiOperation({ summary: 'Get products from OTAPI for a specific category' })
  @ApiResponse({
    status: 200,
    description: 'OTAPI category products retrieved',
  })
  @ApiQuery({
    name: 'categoryId',
    required: true,
    type: Number,
    description: 'OTC Category ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  async getOtapiCategoryProducts(
    @Query('categoryId', ParseIntPipe) categoryId: number, // Ensure categoryId is a number
    @Query('page', { transform: (value) => Number(value) || 1 })
    page: number = 1, // Coerce to number
    @Query('perPage', { transform: (value) => Number(value) || 36 })
    perPage: number = 36, // Coerce to number
  ) {
    return this.categoryService.getCategoryProductsFromOtapi(
      categoryId,
      page,
      perPage,
    );
  }

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload an image and get a public URL' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        // destination: '/aliba-live-update/server/public/uploads',
        destination: 'public/uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    // Use your deployed domain instead of localhost
    const publicUrl = `https://alibaapi.pino10.shop/uploads/${file.filename}`;
    return { imageUrl: publicUrl };
  }

  @Get('search-otapi')
  @ApiOperation({
    summary:
      'Search items from OTAPI with pagination and optional image search',
  })
  @ApiResponse({ status: 200, description: 'OTAPI search results retrieved' })
  @ApiQuery({
    name: 'searchKey',
    type: String,
    required: false,
    description: 'Text search key',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'perPage',
    type: Number,
    required: false,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'imageUrl',
    type: String,
    required: false,
    description: 'URL of the image to search by',
  })
  async searchOtapiItems(
    @Query('searchKey') searchKey: string = '',
    @Query('page') page = 1,
    @Query('perPage') perPage = 36,
    @Query('imageUrl') imageUrl?: string,
  ) {
    return this.categoryService.searchItemsFromOtapi(
      searchKey,
      page,
      perPage,
      imageUrl,
    );
  }

  @Get('product/:itemId')
  @ApiOperation({ summary: 'Get product details from OTAPI by item ID' })
  @ApiParam({
    name: 'itemId',
    description: 'ID of the product to retrieve from OTAPI',
  })
  @ApiResponse({
    status: 200,
    description: 'Product details retrieved from OTAPI',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductDetails(@Param('itemId') itemId: string) {
    try {
      const productDetails =
        await this.categoryService.getProductDetailsFromOtapi(itemId);
      return productDetails;
    } catch (error) {
      throw new NotFoundException(
        `Product with ID ${itemId} not found or OTAPI error: ${error.message}`,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiParam({ name: 'id', description: 'ID of the category to retrieve' })
  @ApiQuery({
    name: 'subcategory',
    required: false,
    description: 'Subcategory ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the category.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('id') id: string, @Query('subcategory') subcategory?: string) {
    return this.categoryService.findOne(id, subcategory);
  }

  @Get(':id/products')
  @ApiOperation({
    summary: 'Get products in a category with pagination and filters',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the category to retrieve products for',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'priceRange',
    required: false,
    description: 'Price range filter, e.g., [min,max]',
  })
  @ApiQuery({
    name: 'sizes',
    required: false,
    description: 'Size filter, e.g., [small,medium]',
  })
  @ApiQuery({
    name: 'colors',
    required: false,
    description: 'Color filter, e.g., [red,blue]',
  })
  @ApiQuery({
    name: 'sortPrice',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort by price',
  })
  async getCategoryProducts(
    @Param('id') id: string,
    @Query() query: any, // using `any` to capture query params directly
  ) {
    const filterProductDto = new FilterProductDto();

    filterProductDto.page = query.page ? Number(query.page) : 1; // convert to number
    filterProductDto.perPage = query.perPage ? Number(query.perPage) : 10; // convert to number
    filterProductDto.priceRange = query.priceRange
      ? JSON.parse(query.priceRange)
      : undefined; // parse JSON if necessary
    filterProductDto.sizes = query.sizes ? query.sizes.split(',') : undefined; // assume comma-separated
    filterProductDto.colors = query.colors
      ? query.colors.split(',')
      : undefined; // assume comma-separated
    filterProductDto.sortPrice = query.sortPrice;

    return this.categoryService.findOneWithProducts(id, filterProductDto);
  }

  @Get('vendor/:id')
  @ApiOperation({ summary: 'Get products from OTAPI for a specific vendor' })
  @ApiResponse({
    status: 200,
    description: 'OTAPI vendor products retrieved',
  })
  @ApiResponse({ status: 404, description: 'Vendor or products not found' })
  @ApiParam({
    name: 'id',
    description: 'Vendor ID to retrieve products for from OTAPI',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  async getOtapiVendorProducts(
    @Param('id') vendorId: string, // Vendor ID as a string, as OTAPI often uses string-based IDs
    @Query('page', { transform: (value) => Number(value) || 1 })
    page: number = 1,
    @Query('perPage', { transform: (value) => Number(value) || 36 })
    perPage: number = 36,
  ) {
    return this.categoryService.getVendorProductsFromOtapi(
      vendorId,
      page,
      perPage,
    );
  }

  @Get(':id/user')
  @ApiOperation({ summary: 'Get a category for user by id' })
  @ApiParam({ name: 'id', description: 'ID of the category to retrieve' })
  @ApiQuery({
    name: 'subcategory',
    required: false,
    description: 'Subcategory ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the category for user.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOneForUser(
    @Param('id') id: string,
    @Query('subcategory') subcategory?: string,
  ) {
    return this.categoryService.findOneForUser(id, subcategory);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'ID of the category to update' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'ID of the category to delete' })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
