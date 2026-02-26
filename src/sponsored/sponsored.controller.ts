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
import { SponsoredService } from './sponsored.service';
import { CreateSponsoredDto } from './dto/create-sponsored.dto';
import { UpdateSponsoredDto } from './dto/update-sponsored.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrOwnerGuard } from '../auth/admin-or-owner.guard';
import { CurrentUser } from '../users/dto/currentUser';

@ApiTags('sponsored')
@Controller('sponsored')
export class SponsoredController {
  constructor(private readonly sponsoredService: SponsoredService) {}

  /** Public: get sponsored video for user's current location (when they tap "Use my location") */
  @Get('by-location')
  @ApiOperation({ summary: 'Get sponsored video for latitude/longitude' })
  @ApiResponse({ status: 200, description: 'Returns active sponsored for this area or null' })
  async getByLocation(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return { sponsored: null };
    }
    return this.sponsoredService.getByLocation(lat, lng);
  }

  /** List sponsored campaigns (admin: all, owner: own) */
  @Get()
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'List sponsored campaigns' })
  async findAll(@CurrentUser() user: { id: string; role: string }) {
    return this.sponsoredService.findAll(user.id, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one sponsored campaign' })
  async findOne(@Param('id') id: string) {
    return this.sponsoredService.findOne(id);
  }

  /** Create sponsored: admin selects owner (sponsored for that owner); owner creates for themselves. Home shows that owner’s details. */
  @Post()
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Create sponsored campaign' })
  @ApiResponse({ status: 201, description: 'Sponsored campaign created' })
  async create(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateSponsoredDto,
  ) {
    return this.sponsoredService.create(user.id, user.role, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Update sponsored campaign' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateSponsoredDto,
  ) {
    return this.sponsoredService.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Cancel sponsored campaign' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sponsoredService.remove(id, user.id, user.role);
  }
}
