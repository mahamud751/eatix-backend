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
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wishlist' })
  @ApiResponse({
    status: 201,
    description: 'The wishlist has been successfully created.',
  })
  create(@Body() createWishlistDto: CreateWishlistDto) {
    return this.wishlistService.create(createWishlistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wishlist' })
  @ApiResponse({ status: 200, description: 'Return all wishlist' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
    @Query('email') email?: string,
    @Query('productId') productId?: string,
  ) {
    return this.wishlistService.findAll(page, perPage, email, productId);
  }

  @Get('/myWishlist')
  @ApiOperation({ summary: 'Get all subcategories' })
  @ApiResponse({ status: 200, description: 'Return all subcategories.' })
  async findEmail(
    @Query('productId') productId: string,
    @Query('email') email?: string,
  ) {
    return this.wishlistService.findOneByProductAndEmail(productId, email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wishlist by id' })
  @ApiParam({ name: 'id', description: 'ID of the wishlist to retrieve' })
  @ApiResponse({ status: 200, description: 'Return the wishlist.' })
  @ApiResponse({ status: 404, description: 'Wishlist not found.' })
  findOne(@Param('id') id: string) {
    return this.wishlistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wishlist' })
  @ApiParam({ name: 'id', description: 'ID of the wishlist to update' })
  @ApiResponse({
    status: 200,
    description: 'The wishlist has been successfully updated.',
  })
  update(
    @Param('id') id: string,
    @Body() updateWishlistDto: UpdateWishlistDto,
  ) {
    return this.wishlistService.update(id, updateWishlistDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wishlist' })
  @ApiParam({ name: 'id', description: 'ID of the wishlist to delete' })
  @ApiResponse({
    status: 200,
    description: 'The wishlist has been successfully deleted.',
  })
  remove(@Param('id') id: string) {
    return this.wishlistService.remove(id);
  }
}
