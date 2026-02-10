// users.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { Prisma, Product } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<{ user: any; token: string }> {
    const {
      name,
      address,
      email,
      phone,
      password,
      role,
      branch,
      departmentId,
      categoryId,
      photos,
      provider,
      providerId,
      nationalId,
      dateOfBirth,
      businessName,
      businessType,
      tradeLicense,
      businessAddress,
      numEmployees,
      yearsInOperation,
      preferredLocation,
      desiredStartDate,
      manageSeerToBradgyn,
      servicePackage,
      reasonForFranchise,
      previousExperience,
      experienceDetails,
      paymentMethod,
      bankName,
      bankAccount,
      initialInvestment,
      expectedRevenue,
      numStaff,
      staffNames,
      relation,
      phoneNumber,
      socialMedia,
      termsAccepted,
      policyAccepted,
      ndaAccepted,
      documents,
    } = createUserDto;
    const photoObjects =
      photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with email already exists');
    }

    // Auto-assign password for employees and franchises
    let passwordToUse = password;
    if (
      !password &&
      (role === 'employee' || role === 'franchise' || role === 'user' || !role)
    ) {
      passwordToUse = '123456Aa';
    }

    let hashedPassword: string | undefined;
    if (passwordToUse) {
      hashedPassword = await bcrypt.hash(passwordToUse, 10);
    }

    // Set initial status to 'pending' for employee, franchise, and client
    const initialStatus =
      role === 'employee' || role === 'franchise' || role === 'client'
        ? 'pending'
        : 'active';

    const existingUserWithRole = await this.prisma.user.findFirst({
      where: { role: role || 'user' },
      include: { permissions: true },
    });

    const permissionIdsToCopy =
      existingUserWithRole?.permissions?.map((perm) => perm.id) || [];

    const user = await this.prisma.user.create({
      data: {
        name,
        address,
        email,
        phone,
        role: role || 'user',
        password: hashedPassword,
        branchId: branch,
        departmentId,
        categoryId,
        photos: photoObjects,
        provider,
        providerId,
        status: initialStatus,
        nationalId,
        dateOfBirth,
        businessName,
        businessType,
        tradeLicense,
        businessAddress,
        numEmployees,
        yearsInOperation,
        preferredLocation,
        desiredStartDate,
        manageSeerToBradgyn,
        servicePackage: servicePackage || 'basic',
        reasonForFranchise,
        previousExperience,
        experienceDetails,
        paymentMethod,
        bankName,
        bankAccount,
        initialInvestment,
        expectedRevenue,
        documents: documents || [],
        numStaff,
        staffNames,
        relation,
        phoneNumber,
        socialMedia,
        termsAccepted,
        policyAccepted,
        ndaAccepted,
        permissions: {
          connect: permissionIdsToCopy.map((id) => ({ id })),
        },
      },
      include: { permissions: true },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.configService.get('JWT_SECRET'),
      { expiresIn: '1h' },
    );

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      employeeId: user.employeeId,
      permissions: user.permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      })),
    };

    return { user: userData, token };
  }

  async loginUser(
    loginUserDto: LoginUserDto,
  ): Promise<{ token: string; user: Partial<any> }> {
    const { email, password } = loginUserDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        branch: true,
        permissions: true,
        roleModel: true,
        clientBusiness: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'blocked' || user.status === 'deactive') {
      throw new UnauthorizedException(
        'User is blocked or deactivated and cannot log in',
      );
    }

    if (user.status === 'pending') {
      throw new UnauthorizedException(
        'Your account is pending approval. Please wait for admin approval.',
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      roleId: user.roleId,
      employeeId: user.employeeId,

      branch: user.branch,
      clientBusiness: user.clientBusiness,
      permissions: user.permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      })),
    };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.configService.get('JWT_SECRET'),
      { expiresIn: '1h' },
    );

    return { token, user: userData };
  }

  async loginAdmin(
    loginUserDto: LoginUserDto,
  ): Promise<{ token: string; user: Partial<any> }> {
    const { email, password } = loginUserDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        branch: true,
        permissions: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'blocked' || user.status === 'deactive') {
      throw new UnauthorizedException(
        'User is blocked or deactivated and cannot log in',
      );
    }
    if (
      user.role !== 'superAdmin' &&
      user.role !== 'manager' &&
      user.role !== 'vendor' &&
      user.role !== 'rider' &&
      user.role !== 'schoolManager' &&
      user.role !== 'b2bManager' &&
      user.role !== 'admin'
    ) {
      throw new UnauthorizedException('User has no access');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      employeeId: user.employeeId,
      branch: user.branch,
      permissions: user.permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      })),
    };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.configService.get('JWT_SECRET'),
      { expiresIn: '1h' },
    );

    return { token, user: userData };
  }

  async updatePassword(updatePasswordDto: any): Promise<{ message: string }> {
    const {
      userId,
      currentPassword,
      newPassword,
      name,
      email,
      phone,
      address,
    } = updatePasswordDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // if (user.role !== 'admin') {
    //   throw new UnauthorizedException('Unauthorized access');
    // }

    if (currentPassword) {
      const passwordMatch = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!passwordMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        address,
        password: user.password,
      },
    });

    return { message: 'User data updated successfully' };
  }

  async deleteUser(id: string): Promise<string> {
    await this.prisma.user.delete({ where: { id } });
    return 'Deleted successfully';
  }

  async getUsers(
    role?: string,
    email?: string,
    page: number = 1,
    perPage: number = 25,
    getAll: boolean = false, // Add getAll parameter
  ): Promise<{ data: any[]; total: number }> {
    // If getAll is true, bypass pagination and return all users
    if (getAll) {
      const data = await this.prisma.user.findMany({
        where: {
          ...(role && { role }),
          ...(email && { email: { contains: email, mode: 'insensitive' } }),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          advances: true,
          permissions: true,
          department: true,
          category: true,
        },
      });

      return { data, total: data.length };
    }

    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;
    const skip = (pageNumber - 1) * perPageNumber;
    const totalCountPromise = this.prisma.user.count({
      where: {
        ...(role && { role }),
        ...(email && { email: { contains: email, mode: 'insensitive' } }),
      },
    });

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
    };

    const dataPromise = this.prisma.user.findMany({
      skip,
      take: perPageNumber,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        advances: true,
        permissions: true,
        department: true,
        category: true,
      },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async getAdmin(email: string): Promise<any> {
    const adminUser = await this.prisma.user.findUnique({
      where: { email, role: 'admin' },
    });
    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }
    return adminUser;
  }

  async getVendors(): Promise<any[]> {
    return this.prisma.user.findMany({ where: { role: 'vendor' } });
  }

  async getJWT(email: string): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = jwt.sign({ email }, this.configService.get('JWT_SECRET'), {
        expiresIn: '1h',
      });
      return { accessToken: token };
    }
    throw new NotFoundException('User not found');
  }

  async getUser(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        permissions: true,
        roleModel: true,
        branch: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return user data in same format as login
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      roleId: user.roleId,
      status: user.status,
      branch: user.branch,
      roleModel: user.roleModel,
      permissions: user.permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      })),
    };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const oldUser = await this.prisma.user.findUnique({
      where: { id },
      include: { permissions: true, roleModel: true },
    });

    if (!oldUser) {
      throw new NotFoundException('User not found');
    }

    const {
      photos,
      name,
      email,
      address,
      phone,
      status,
      permissions,
      roleId,
      businessName,
      businessAddress,
      ...otherFields
    } = updateUserDto;

    // Build update data object with only provided fields
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessAddress !== undefined)
      updateData.businessAddress = businessAddress;

    // Handle roleId and update role field based on roleModel
    if (roleId !== undefined) {
      updateData.roleId = roleId;

      // Fetch the role to get the role name
      const roleModel = await this.prisma.role.findUnique({
        where: { id: roleId },
      });

      if (roleModel) {
        updateData.role = roleModel.name; // Update role field with role name
      }
    }

    // Add other fields that were provided
    Object.keys(otherFields).forEach((key) => {
      if (otherFields[key] !== undefined) {
        updateData[key] = otherFields[key];
      }
    });

    // Handle permissions separately
    if (permissions) {
      updateData.permissions = {
        set: permissions.map((permissionId) => ({ id: permissionId })),
      };
    }

    const userUpdate = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    await this.auditLogService.log(id, 'User', 'UPDATE', oldUser, userUpdate);
    return { message: 'User updated successfully', userUpdate };
  }

  async updateUserRole(id: string, updateUserDto: UpdateUserDto) {
    const oldUser = await this.prisma.user.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!oldUser) {
      throw new NotFoundException('User not found');
    }

    const { permissions, role } = updateUserDto;

    let permissionsData = undefined;

    if (role && role !== oldUser.role) {
      const newRolePermissions = await this.prisma.user.findFirst({
        where: { role },
        include: { permissions: true },
      });

      const permissionIdsToSet =
        newRolePermissions?.permissions?.map((perm) => perm.id) || [];

      permissionsData = {
        set: permissionIdsToSet.map((id) => ({ id })),
      };
    } else if (permissions) {
      permissionsData = {
        set: permissions.map((permissionId) => ({ id: permissionId })),
      };
    }

    const userUpdate = await this.prisma.user.update({
      where: { id },
      data: {
        role,
        permissions: permissionsData,
      },
    });

    await this.auditLogService.log(id, 'User', 'UPDATE', oldUser, userUpdate);
    return { message: 'User updated successfully', userUpdate };
  }

  async batchUpdateUsers(ids: string[], updateUserDto: UpdateUserDto) {
    const updatePromises = ids.map(async (id) => {
      try {
        const oldUser = await this.prisma.user.findUnique({
          where: { id },
          include: { permissions: true },
        });

        if (!oldUser) {
          throw new NotFoundException(`User ${id} not found`);
        }

        const { photos, permissions, ...rest } = updateUserDto;
        const photoObjects =
          photos?.map((photo) => ({
            title: photo.title,
            src: photo.src,
          })) || [];

        const permissionsData = permissions
          ? { set: permissions.map((permissionId) => ({ id: permissionId })) }
          : undefined;

        const userUpdate = await this.prisma.user.update({
          where: { id },
          data: {
            ...rest,
            photos: photoObjects.length > 0 ? photoObjects : undefined,
            permissions: permissionsData,
          },
        });

        await this.auditLogService.log(
          id,
          'User',
          'UPDATE',
          oldUser,
          userUpdate,
        );
        return { message: `User ${id} updated successfully`, userUpdate };
      } catch (error) {
        console.error(`Error updating user ${id}:`, error);
        throw new InternalServerErrorException(`Failed to update user ${id}`);
      }
    });

    try {
      const results = await Promise.all(updatePromises);
      return { message: 'All users updated successfully', results };
    } catch (error) {
      console.error('Error updating multiple users:', error);
      throw new InternalServerErrorException('Failed to update multiple users');
    }
  }

  async getLastVisitedProducts(userId: string): Promise<Product[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastVisited: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const productIds = user.lastVisited;

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        subcategory: true,
        branch: true,
        reviews: true,
      },
    });

    return products;
  }

  async updateUserAdmin(id: string, updateUserDto: any): Promise<any> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }
}
