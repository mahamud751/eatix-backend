import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRolePermissionsDto,
} from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  // Create a new role
  async create(dto: CreateRoleDto) {
    // Check if role name already exists
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Role with name "${dto.name}" already exists`,
      );
    }

    const { permissionIds, ...roleData } = dto;

    // Create role
    const role = await this.prisma.role.create({
      data: roleData,
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // If permissionIds provided, assign them
    if (permissionIds && permissionIds.length > 0) {
      await this.assignPermissions({ roleId: role.id, permissionIds });
    }

    return this.findOne(role.id);
  }

  // Get all roles
  async findAll(page: number = 1, perPage: number = 100) {
    const skip = (page - 1) * perPage;

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take: perPage,
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.role.count(),
    ]);

    // Transform response to include permissions array and user count
    const transformedRoles = roles.map((role) => ({
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      userCount: role._count.users,
      rolePermissions: undefined,
      _count: undefined,
    }));

    return {
      data: transformedRoles,
      meta: {
        currentPage: page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // Get single role by ID
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      userCount: role._count.users,
      rolePermissions: undefined,
      _count: undefined,
    };
  }

  // Update role
  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    // Check if system role
    if (role.isSystem && dto.name) {
      throw new BadRequestException('Cannot rename system roles');
    }

    // Check name uniqueness if changing name
    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Role with name "${dto.name}" already exists`,
        );
      }
    }

    const { permissionIds, ...roleData } = dto;

    // Update role
    await this.prisma.role.update({
      where: { id },
      data: roleData,
    });

    // Update permissions if provided
    if (permissionIds) {
      await this.assignPermissions({ roleId: id, permissionIds });

      // Update all users with this role to have these permissions
      await this.syncUserPermissions(id, permissionIds);
    }

    return this.findOne(id);
  }

  // Delete role
  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is assigned to ${role._count.users} user(s)`,
      );
    }

    await this.prisma.role.delete({ where: { id } });

    return { message: `Role "${role.name}" deleted successfully` };
  }

  // Assign permissions to role
  async assignPermissions(dto: AssignRolePermissionsDto) {
    const { roleId, permissionIds } = dto;

    // Verify role exists
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Some permissions not found');
    }

    // Delete existing role permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new role permissions
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    return {
      message: 'Role permissions updated successfully',
      role: await this.findOne(roleId),
    };
  }

  // Sync user permissions based on their role
  async syncUserPermissions(roleId: string, permissionIds: string[]) {
    // Get all users with this role who don't have individual permission overrides
    const users = await this.prisma.user.findMany({
      where: { roleId },
      include: {
        permissions: true,
      },
    });

    // For each user, check if they have individual permissions
    // If they don't, update them with role permissions
    for (const user of users) {
      // Only sync if user has no individual permissions set
      // (or has the exact same permissions as the old role)
      if (user.permissions.length === 0) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            permissions: {
              set: permissionIds.map((id) => ({ id })),
            },
          },
        });
      }
    }

    return {
      message: `Synced permissions for ${users.length} users`,
      usersUpdated: users.length,
    };
  }

  // Get role statistics
  async getStats() {
    const [totalRoles, systemRoles, customRoles, totalUsers] =
      await Promise.all([
        this.prisma.role.count(),
        this.prisma.role.count({ where: { isSystem: true } }),
        this.prisma.role.count({ where: { isSystem: false } }),
        this.prisma.user.count(),
      ]);

    const rolesWithUsers = await this.prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return {
      totalRoles,
      systemRoles,
      customRoles,
      totalUsers,
      roleDistribution: rolesWithUsers.map((role) => ({
        roleId: role.id,
        roleName: role.name,
        userCount: role._count.users,
      })),
    };
  }
}
