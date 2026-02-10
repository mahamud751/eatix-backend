import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  // UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

// import { AdminRoleGuard } from 'src/auth/AdminRoleGuard';
// import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreatePaymentPercentDto } from './dto/create-payment-percent.dto';
import { PaymentPercentService } from './payment-percent.service';
import { UpdatePaymentPercentDto } from './dto/update-payment-percent.dto';

// @UseGuards(JwtAuthGuard)
@ApiTags('payment-percent')
@Controller('payment-percent')
export class PaymentPercentController {
  constructor(private readonly paymentPercentService: PaymentPercentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({
    status: 201,
    description: 'The banner has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() CreatePaymentPercentDto: CreatePaymentPercentDto) {
    console.log(CreatePaymentPercentDto);
    return this.paymentPercentService.create(CreatePaymentPercentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners' })
  @ApiResponse({ status: 200, description: 'Return all banners.' })
  async findAll() {
    return this.paymentPercentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by id' })
  @ApiParam({ name: 'id', description: 'ID of the banner to retrieve' })
  @ApiResponse({ status: 200, description: 'Return the banner.' })
  @ApiResponse({ status: 404, description: 'banner not found.' })
  findOne(@Param('id') id: string) {
    return this.paymentPercentService.findOne(id);
  }

  @Get(':id/user')
  @ApiOperation({ summary: 'Get a banner for user by id' })
  @ApiParam({ name: 'id', description: 'ID of the banner to retrieve' })
  @ApiResponse({ status: 200, description: 'Return the banner for user.' })
  @ApiResponse({ status: 404, description: 'Banner not found.' })
  findOneForUser(@Param('id') id: string) {
    return this.paymentPercentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'ID of the banner to update' })
  @ApiBody({ type: UpdatePaymentPercentDto })
  @ApiResponse({
    status: 200,
    description: 'The banner has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'banner not found.' })
  update(
    @Param('id') id: string,
    @Body() UpdatePaymentPercentDto: UpdatePaymentPercentDto,
  ) {
    return this.paymentPercentService.update(id, UpdatePaymentPercentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiParam({ name: 'id', description: 'ID of the banner to delete' })
  @ApiResponse({
    status: 200,
    description: 'The banner has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Banner not found.' })
  remove(@Param('id') id: string) {
    return this.paymentPercentService.remove(id);
  }
}
