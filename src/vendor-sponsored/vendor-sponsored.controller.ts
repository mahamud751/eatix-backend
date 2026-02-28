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
import { VendorSponsoredService } from './vendor-sponsored.service';
import { CreateVendorSponsoredDto } from './dto/create-vendor-sponsored.dto';
import { UpdateVendorSponsoredDto } from './dto/update-vendor-sponsored.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/AdminRoleGuard';
import { CurrentUser } from '../users/dto/currentUser';

@ApiTags('vendor-sponsored')
@Controller('vendor-sponsored')
export class VendorSponsoredController {
  constructor(private readonly vendorSponsoredService: VendorSponsoredService) {}

  @Get('by-location')
  @ApiOperation({ summary: 'Get vendor sponsored video for latitude/longitude' })
  @ApiResponse({ status: 200, description: 'Returns active vendor sponsored for this area or null' })
  async getByLocation(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return { sponsored: null };
    }
    return this.vendorSponsoredService.getByLocation(lat, lng);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'List vendor sponsored campaigns (admin only)' })
  async findAll(@CurrentUser() user: { id: string; role: string }) {
    return this.vendorSponsoredService.findAll(user.id, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one vendor sponsored campaign' })
  async findOne(@Param('id') id: string) {
    return this.vendorSponsoredService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Create vendor sponsored campaign (admin only)' })
  @ApiResponse({ status: 201, description: 'Vendor sponsored campaign created' })
  async create(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateVendorSponsoredDto,
  ) {
    return this.vendorSponsoredService.create(user.id, user.role, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Update vendor sponsored campaign (admin only)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateVendorSponsoredDto,
  ) {
    return this.vendorSponsoredService.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Cancel vendor sponsored campaign (admin only)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.vendorSponsoredService.remove(id, user.id, user.role);
  }
}
