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
  ApiBody,
} from '@nestjs/swagger';
import { DiscountService } from './discount.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@ApiTags('discounts')
@Controller('discounts')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new discount' })
  @ApiResponse({
    status: 201,
    description: 'The discount has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountService.create(createDiscountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all discounts' })
  @ApiResponse({ status: 200, description: 'Return all discounts.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
    @Query('name') name?: string,
    @Query('code') code?: string,
  ) {
    return this.discountService.findAll(page, perPage, name, code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a discount by id' })
  @ApiParam({ name: 'id', description: 'ID of the discount to retrieve' })
  @ApiResponse({ status: 200, description: 'Return the discount.' })
  @ApiResponse({ status: 404, description: 'Discount not found.' })
  findOne(@Param('id') id: string) {
    return this.discountService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a discount' })
  @ApiParam({ name: 'id', description: 'ID of the discount to update' })
  @ApiBody({ type: UpdateDiscountDto })
  @ApiResponse({
    status: 200,
    description: 'The discount has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Discount not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ) {
    return this.discountService.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a discount' })
  @ApiParam({ name: 'id', description: 'ID of the discount to delete' })
  @ApiResponse({
    status: 200,
    description: 'The discount has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Discount not found.' })
  remove(@Param('id') id: string) {
    return this.discountService.remove(id);
  }
}
