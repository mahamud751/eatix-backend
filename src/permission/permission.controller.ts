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
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AssignRolePermissionsDto } from './dto/role-permission.dto';
import { AssignUserPermissionsDto } from './dto/user-permission.dto';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionController {
  constructor(private readonly bannerService: PermissionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({
    status: 201,
    description: 'The permission has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() CreatePermissionDto: CreatePermissionDto) {
    return this.bannerService.create(CreatePermissionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Return all permissions.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.bannerService.findAll(page, perPage);
  }

  // Role Permission Endpoints
  @Post('roles/assign')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiBody({ type: AssignRolePermissionsDto })
  @ApiResponse({
    status: 200,
    description: 'Role permissions assigned successfully.',
  })
  assignRolePermissions(@Body() dto: AssignRolePermissionsDto) {
    return this.bannerService.assignRolePermissions(dto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  @ApiResponse({
    status: 200,
    description: 'Return all roles with permissions.',
  })
  getAllRolesPermissions() {
    return this.bannerService.getAllRolesPermissions();
  }

  @Get('roles/:role')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiParam({ name: 'role', description: 'Role name' })
  @ApiResponse({
    status: 200,
    description: 'Return permissions for the role.',
  })
  getRolePermissions(@Param('role') role: string) {
    return this.bannerService.getRolePermissions(role);
  }

  // User Permission Endpoints
  @Post('users/assign')
  @ApiOperation({ summary: 'Assign permissions to a user' })
  @ApiBody({ type: AssignUserPermissionsDto })
  @ApiResponse({
    status: 200,
    description: 'User permissions assigned successfully.',
  })
  assignUserPermissions(@Body() dto: AssignUserPermissionsDto) {
    return this.bannerService.assignUserPermissions(dto);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get permissions for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Return permissions for the user.',
  })
  getUserPermissions(@Param('userId') userId: string) {
    return this.bannerService.getUserPermissions(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a permission by id' })
  @ApiParam({ name: 'id', description: 'ID of the permission to retrieve' })
  @ApiQuery({
    name: 'subbanner',
    required: false,
    description: 'Subbanner ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the permission.' })
  @ApiResponse({ status: 404, description: 'permission not found.' })
  findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Get(':id/user')
  @ApiOperation({ summary: 'Get a permission for user by id' })
  @ApiParam({ name: 'id', description: 'ID of the permission to retrieve' })
  @ApiQuery({
    name: 'subbanner',
    required: false,
    description: 'Subbanner ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the permission for user.' })
  @ApiResponse({ status: 404, description: 'Permission not found.' })
  findOneForUser(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a permission' })
  @ApiParam({ name: 'id', description: 'ID of the permission to update' })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiResponse({
    status: 200,
    description: 'The permission has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'permission not found.' })
  update(
    @Param('id') id: string,
    @Body() UpdatePermissionDto: UpdatePermissionDto,
  ) {
    return this.bannerService.update(id, UpdatePermissionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a permission' })
  @ApiParam({ name: 'id', description: 'ID of the permission to delete' })
  @ApiResponse({
    status: 200,
    description: 'The permission has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'permission not found.' })
  remove(@Param('id') id: string) {
    return this.bannerService.remove(id);
  }
}
