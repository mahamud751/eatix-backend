import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRolePermissionsDto,
} from './dto/role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('list')
  findList() {
    return this.roleService.findList();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const perPageNum = Math.min(500, Math.max(1, parseInt(String(perPage), 10) || 100));
    return this.roleService.findAll(pageNum, perPageNum);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.roleService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }

  @Post('assign-permissions')
  @UseGuards(JwtAuthGuard)
  assignPermissions(@Body() dto: AssignRolePermissionsDto) {
    return this.roleService.assignPermissions(dto);
  }

  @Post(':id/sync-users')
  @UseGuards(JwtAuthGuard)
  syncUserPermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.roleService.syncUserPermissions(id, permissionIds);
  }
}
