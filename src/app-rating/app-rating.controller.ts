import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/AdminRoleGuard';
import { CurrentUser } from 'src/users/dto/currentUser';
import { AppRatingService } from './app-rating.service';
import { UpsertAppRatingDto } from './dto/upsert-app-rating.dto';

@ApiTags('app-rating')
@Controller('app-rating')
export class AppRatingController {
  constructor(private readonly appRatingService: AppRatingService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my app rating' })
  async getMine(@CurrentUser() user: { id: string }) {
    return this.appRatingService.getMyRating(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create/update my app rating' })
  @ApiResponse({ status: 200, description: 'Upserted rating' })
  async upsertMine(
    @CurrentUser() user: { id: string },
    @Body() dto: UpsertAppRatingDto,
  ) {
    return this.appRatingService.upsertMyRating(user.id, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete my app rating' })
  async deleteMine(@CurrentUser() user: { id: string }) {
    return this.appRatingService.deleteMyRating(user.id);
  }

  // Admin endpoints
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all app ratings (admin)' })
  async listAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 50,
  ) {
    return this.appRatingService.listAll(Number(page) || 1, Number(perPage) || 50);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an app rating by id (admin)' })
  async deleteById(@Param('id') id: string) {
    return this.appRatingService.deleteById(id);
  }
}
