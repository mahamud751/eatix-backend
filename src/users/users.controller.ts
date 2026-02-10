import {
  Controller,
  Post,
  Body,
  Put,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import Roles from '../auth/roles.decorator';
import RolesGuard from '../auth/roles.guard';
import { Product } from '@prisma/client';
import { AdminRoleGuard } from 'src/auth/AdminRoleGuard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { multerOptions } from '../../middleware/multer.config';

@ApiTags('users')
@Controller('users')
// @UseGuards(RolesGuard)
// @ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post('upload-documents')
  @UseInterceptors(FilesInterceptor('documents', 10, multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user registration documents' })
  @ApiBody({
    description: 'Upload multiple documents (images/PDFs)',
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documents uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async uploadDocuments(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{
    files: Array<{ filename: string; path: string; url: string }>;
  }> {
    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      path: file.path,
      url: `/uploads/${file.filename}`,
    }));

    return { files: uploadedFiles };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.loginUser(loginUserDto);
  }

  @Post('login/admin')
  @ApiOperation({ summary: 'Login a admin' })
  @ApiResponse({ status: 200, description: 'admin logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async loginAdmin(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.loginAdmin(loginUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.usersService.updatePassword(updatePasswordDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully.' })
  async getUsers(
    @Query('role') role?: string,
    @Query('email') email?: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
    @Query('getAll') getAll: boolean = false,
  ) {
    return this.usersService.getUsers(role, email, page, perPage, getAll);
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({ summary: 'Get admin user by email' })
  @ApiResponse({
    status: 200,
    description: 'Admin user retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Admin user not found.' })
  async getAdmin(@Query('email') email: string) {
    return this.usersService.getAdmin(email);
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Get all vendor users' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully.' })
  async getVendors() {
    return this.usersService.getVendors();
  }

  @Get('token')
  @ApiOperation({ summary: 'Get JWT token for a user' })
  @ApiResponse({ status: 200, description: 'Token generated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getJWT(@Query('email') email: string) {
    return this.usersService.getJWT(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Patch('batch-update')
  @ApiOperation({ summary: 'Batch update multiple users' })
  async batchUpdateUsers(
    @Body() body: { ids: string[]; updateUserDto: UpdateUserDto },
  ) {
    const { ids, updateUserDto } = body;
    return this.usersService.batchUpdateUsers(ids, updateUserDto);
  }

  @Patch(':id/update-role')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserRole(id, updateUserDto);
  }

  @Get(':userId/last-visit')
  async getLastVisitedProducts(
    @Param('userId') userId: string,
  ): Promise<Product[]> {
    return this.usersService.getLastVisitedProducts(userId);
  }

  @Put('admin/:id')
  @ApiOperation({ summary: 'Update admin user details' })
  @ApiResponse({ status: 200, description: 'Admin user updated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserAdmin(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserAdmin(id, updateUserDto);
  }
}
