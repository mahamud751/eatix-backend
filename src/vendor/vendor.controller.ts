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
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({
    status: 201,
    description: 'The vendor has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorService.create(createVendorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendor' })
  @ApiResponse({ status: 200, description: 'Return all vendor.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.vendorService.findAll(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a vendor by ID' })
  @ApiParam({ name: 'id', description: 'ID of the vendor to retrieve' })
  @ApiResponse({ status: 200, description: 'The vendor with the given ID' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  findOne(@Param('id') id: string) {
    return this.vendorService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vendor by ID' })
  @ApiParam({ name: 'id', description: 'ID of the vendor to update' })
  @ApiResponse({ status: 200, description: 'The updated vendor' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorService.update(id, updateVendorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vendor by ID' })
  @ApiParam({ name: 'id', description: 'ID of the vendor to delete' })
  @ApiResponse({ status: 200, description: 'The deleted vendor' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  remove(@Param('id') id: string) {
    return this.vendorService.remove(id);
  }
}
