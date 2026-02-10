import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
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
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('perPage', ParseIntPipe) perPage: number = 100,
  ) {
    return this.roleService.findAll(page, perPage);
  }

  @Get('stats')
  getStats() {
    return this.roleService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }

  @Post('assign-permissions')
  assignPermissions(@Body() dto: AssignRolePermissionsDto) {
    return this.roleService.assignPermissions(dto);
  }

  @Post(':id/sync-users')
  syncUserPermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.roleService.syncUserPermissions(id, permissionIds);
  }
}
