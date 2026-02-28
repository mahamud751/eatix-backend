import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorFeaturedService } from './vendor-featured.service';
import { CreateVendorFeaturedDto } from './dto/create-vendor-featured.dto';
import { UpdateVendorFeaturedDto } from './dto/update-vendor-featured.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/AdminRoleGuard';
import { CurrentUser } from '../users/dto/currentUser';

@ApiTags('vendor-featured')
@Controller('vendor-featured')
export class VendorFeaturedController {
  constructor(private readonly vendorFeaturedService: VendorFeaturedService) {}

  @Get('by-location')
  @ApiOperation({ summary: 'Get vendor featured video for latitude/longitude' })
  @ApiResponse({ status: 200, description: 'Returns active vendor featured for this area or null' })
  async getByLocation(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return { featured: null };
    }
    return this.vendorFeaturedService.getByLocation(lat, lng);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'List vendor featured campaigns (admin only)' })
  async findAll(@CurrentUser() user: { id: string; role: string }) {
    return this.vendorFeaturedService.findAll(user.id, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one vendor featured campaign' })
  async findOne(@Param('id') id: string) {
    return this.vendorFeaturedService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Create vendor featured campaign (admin only)' })
  @ApiResponse({ status: 201, description: 'Vendor featured campaign created' })
  async create(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateVendorFeaturedDto,
  ) {
    return this.vendorFeaturedService.create(user.id, user.role, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Update vendor featured campaign (admin only)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateVendorFeaturedDto,
  ) {
    return this.vendorFeaturedService.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Cancel vendor featured campaign (admin only)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.vendorFeaturedService.remove(id, user.id, user.role);
  }
}
