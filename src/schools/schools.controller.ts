import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { SchoolService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@ApiTags('Schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post()
  @ApiOperation({ summary: 'Create school and manager' })
  async createSchoolAndManager(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolService.createSchoolAndManager(createSchoolDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schools' })
  async getSchool(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.schoolService.getSchool(page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single school' })
  async getSingleSchool(@Param('id') id: string) {
    return this.schoolService.getSingleSchool(id);
  }

  @Get('manager')
  @ApiOperation({ summary: 'Get school manager by email' })
  async getSchoolManager(@Query('email') email: string) {
    return this.schoolService.getSchoolManager(email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a school' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchool(@Param('id') id: string) {
    return this.schoolService.deleteSchool(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a School by ID' })
  @ApiParam({ name: 'id', description: 'ID of the School to update' })
  @ApiBody({ type: UpdateSchoolDto })
  @ApiResponse({ status: 200, description: 'The updated School' })
  @ApiResponse({ status: 404, description: 'School not found' })
  update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolService.update(id, updateSchoolDto);
  }
}
