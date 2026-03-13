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
import {
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import {
  SetPinDto,
  VerifyPinDto,
  SetFingerprintDto,
  UpdateRememberMeDto,
} from './dto/set-pin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { R2StorageService } from '../r2-storage/r2-storage.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly r2Storage: R2StorageService,
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
      roleId,
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

    let roleName = role || 'user';
    let finalRoleId: string | undefined = roleId;
    if (roleId) {
      const roleRecord = await this.prisma.role.findUnique({
        where: { id: roleId },
      });
      if (roleRecord) {
        roleName = roleRecord.name;
      } else {
        finalRoleId = undefined;
      }
    }

    // Auto-assign password for employees and franchises
    let passwordToUse = password;
    if (
      !password &&
      (roleName === 'employee' || roleName === 'franchise' || roleName === 'user' || !roleName)
    ) {
      passwordToUse = '123456Aa';
    }

    let hashedPassword: string | undefined;
    if (passwordToUse) {
      hashedPassword = await bcrypt.hash(passwordToUse, 10);
    }

    // Set initial status to 'pending' for employee, franchise, and client
    const initialStatus =
      roleName === 'employee' || roleName === 'franchise' || roleName === 'client'
        ? 'pending'
        : 'active';

    const existingUserWithRole = await this.prisma.user.findFirst({
      where: { role: roleName },
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
        role: roleName,
        roleId: finalRoleId,
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
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      address: user.address,
      role: user.role,
      employeeId: user.employeeId,
      interests: user.interests || [],
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
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      address: user.address,
      latitude: user.latitude ?? undefined,
      longitude: user.longitude ?? undefined,
      role: user.role,
      roleId: user.roleId,
      employeeId: user.employeeId,
      pin: user.pin ? true : false, // Only return if PIN exists (not the actual value)
      photos: user.photos ?? [],
      channelAbout: user.channelAbout ?? undefined,
      socialLinks: user.socialLinks ?? undefined,
      interests: user.interests || [],
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
    getAll: boolean = false,
    search?: string,
  ): Promise<{ data: any[]; total: number }> {
    const searchTerm = search && search.trim() ? search.trim() : '';
    const isEmailSearch = searchTerm.includes('@');
    const searchFilter: Prisma.UserWhereInput | undefined = searchTerm
      ? isEmailSearch
        ? { email: { equals: searchTerm, mode: 'insensitive' } }
        : {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { nickname: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }
      : undefined;

    const baseWhere: Prisma.UserWhereInput = {
      ...(role && {
        role: { equals: role, mode: 'insensitive' },
      }),
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
      ...(searchFilter && searchFilter),
    };

    if (getAll) {
      const data = await this.prisma.user.findMany({
        where: baseWhere,
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
    const totalCountPromise = this.prisma.user.count({ where: baseWhere });
    const where = baseWhere;

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

  async getChannelsList(limit = 20): Promise<{ channels: any[] }> {
    const videoUserIds = await this.prisma.video
      .findMany({
        where: { status: { not: 'deleted' }, visibility: 'public' },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((rows) => rows.map((r) => r.userId));
    const shortUserIds = await this.prisma.short
      .findMany({
        where: { status: { not: 'deleted' }, visibility: 'public' },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((rows) => rows.map((r) => r.userId));
    const allIds = [...new Set([...videoUserIds, ...shortUserIds])];
    const users = await this.prisma.user.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true,
        name: true,
        nickname: true,
        photos: true,
      },
      take: limit,
    });
    const channels = users.map((u) => {
      const channelName = u.nickname || u.name || 'Unknown';
      const firstPhoto = Array.isArray(u.photos) ? u.photos[0] : null;
      const rawSrc =
        firstPhoto && typeof firstPhoto === 'object' && 'src' in firstPhoto
          ? (firstPhoto as { src?: string }).src
          : null;
      const avatar =
        typeof rawSrc === 'string' && rawSrc.trim().length > 0
          ? rawSrc.trim()
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(channelName)}&background=111&color=fff`;
      return { id: u.id, name: channelName, avatar };
    });
    return { channels };
  }

  async getSubscribedFeed(
    userId: string,
    page = 1,
    limit = 30,
  ): Promise<{
    videos: any[];
    shorts: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const subs = await this.prisma.channelSubscription.findMany({
      where: { subscriberId: userId },
      select: { channelUserId: true },
    });
    const channelIds = subs.map((s) => s.channelUserId);
    if (channelIds.length === 0) {
      return {
        videos: [],
        shorts: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      };
    }
    const skip = (page - 1) * limit;
    const half = Math.floor(limit / 2);
    const [videos, shorts] = await Promise.all([
      this.prisma.video.findMany({
        where: {
          userId: { in: channelIds },
          status: { not: 'deleted' },
          visibility: 'public',
        },
        skip: 0,
        take: half,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, nickname: true },
          },
          _count: { select: { likes: true, comments: true, views: true } },
        },
      }),
      this.prisma.short.findMany({
        where: {
          userId: { in: channelIds },
          status: { not: 'deleted' },
          visibility: 'public',
        },
        skip: 0,
        take: half,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, nickname: true },
          },
          _count: { select: { likes: true, comments: true, views: true } },
        },
      }),
    ]);
    const total = videos.length + shorts.length;
    return {
      videos,
      shorts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getChannelProfile(
    userId: string,
    currentUserId?: string,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        channelAbout: true,
        coverUrl: true,
        photos: true,
        createdAt: true,
        address: true,
        latitude: true,
        longitude: true,
        socialLinks: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [videoCount, shortCount, totalVideoViews, totalShortViews, subscriberCount, followingCount, isSubscribed] =
      await Promise.all([
        this.prisma.video.count({
          where: {
            userId,
            status: { not: 'deleted' },
            visibility: 'public',
          },
        }),
        this.prisma.short.count({
          where: {
            userId,
            status: { not: 'deleted' },
            visibility: 'public',
          },
        }),
        this.prisma.video.aggregate({
          where: {
            userId,
            status: { not: 'deleted' },
          },
          _sum: { viewCount: true },
        }),
        this.prisma.short.aggregate({
          where: {
            userId,
            status: { not: 'deleted' },
          },
          _sum: { viewCount: true },
        }),
        this.prisma.channelSubscription.count({
          where: { channelUserId: userId },
        }),
        this.prisma.channelSubscription.count({
          where: { subscriberId: userId },
        }),
        currentUserId && currentUserId !== userId
          ? this.prisma.channelSubscription
              .findUnique({
                where: {
                  subscriberId_channelUserId: {
                    subscriberId: currentUserId,
                    channelUserId: userId,
                  },
                },
              })
              .then((r) => !!r)
          : Promise.resolve(false),
      ]);

    const totalViews =
      (totalVideoViews._sum.viewCount ?? 0) +
      (totalShortViews._sum.viewCount ?? 0);

    const channelName = user.nickname || user.name || 'Unknown';
    const firstPhoto = Array.isArray(user.photos) ? user.photos[0] : null;
    const rawSrc =
      firstPhoto && typeof firstPhoto === 'object' && 'src' in firstPhoto
        ? firstPhoto.src
        : null;
    // Ensure channelAvatar is always a string (Image uri cannot be boolean)
    const channelAvatar =
      typeof rawSrc === 'string' && rawSrc.trim().length > 0
        ? rawSrc.trim()
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
            channelName,
          )}&background=111&color=fff`;

    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      channelName,
      channelAvatar,
      channelAbout: user.channelAbout ?? '',
      coverUrl: user.coverUrl ?? undefined,
      coverImage: user.coverUrl ?? undefined,
      createdAt: user.createdAt,
      address: user.address ?? undefined,
      latitude: user.latitude ?? undefined,
      longitude: user.longitude ?? undefined,
      socialLinks: user.socialLinks ?? undefined,
      videoCount,
      shortCount,
      totalViews,
      subscriberCount,
      followingCount,
      isSubscribed,
    };
  }

  async subscribeToChannel(
    subscriberId: string,
    channelUserId: string,
  ): Promise<{ subscribed: boolean }> {
    if (!subscriberId || !channelUserId) {
      throw new BadRequestException('subscriberId and channelUserId are required');
    }
    if (subscriberId === channelUserId) {
      throw new BadRequestException('Cannot subscribe to your own channel');
    }
    const channel = await this.prisma.user.findUnique({
      where: { id: channelUserId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    await this.prisma.channelSubscription.upsert({
      where: {
        subscriberId_channelUserId: { subscriberId, channelUserId },
      },
      create: { subscriberId, channelUserId },
      update: {},
    });
    return { subscribed: true };
  }

  async unsubscribeFromChannel(
    subscriberId: string,
    channelUserId: string,
  ): Promise<{ subscribed: false }> {
    if (!subscriberId || !channelUserId) {
      throw new BadRequestException('subscriberId and channelUserId are required');
    }
    await this.prisma.channelSubscription.deleteMany({
      where: { subscriberId, channelUserId },
    });
    return { subscribed: false };
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

    // Return user data in same format as login (include address/location for sponsored owner select)
    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
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
      nickname,
      email,
      address,
      latitude,
      longitude,
      phone,
      gender,
      status,
      permissions,
      roleId,
      businessName,
      businessAddress,
      socialLinks,
      ...otherFields
    } = updateUserDto;

    // Build update data object with only provided fields
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (status !== undefined) updateData.status = status;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessAddress !== undefined)
      updateData.businessAddress = businessAddress;
    if (socialLinks !== undefined)
      updateData.socialLinks = socialLinks as any;

    if (photos !== undefined && Array.isArray(photos)) {
      updateData.photos = photos.map((p) => ({
        title: p.title,
        src: p.src,
      }));
    }

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

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Profile image file is required');
    }
    const { url } = await this.r2Storage.uploadFile(file, 'avatars');
    const photos = [{ title: 'avatar', src: url }];
    const userUpdate = await this.prisma.user.update({
      where: { id: userId },
      data: { photos: photos as any },
    });
    return { message: 'Avatar updated', userUpdate, photoUrl: url };
  }

  async uploadCoverImage(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Cover image file is required');
    }
    const { url } = await this.r2Storage.uploadFile(file, 'covers');
    await this.prisma.user.update({
      where: { id: userId },
      data: { coverUrl: url },
    });
    return { message: 'Cover updated', coverUrl: url };
  }

  async getGallery(userId: string) {
    const photos = await this.prisma.userGalleryPhoto.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { photos };
  }

  async uploadGallery(userId: string, files: Express.Multer.File[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!files?.length) throw new BadRequestException('At least one image is required');
    const created: { id: string; src: string }[] = [];
    for (const file of files) {
      if (!file.buffer || !file.mimetype?.startsWith('image/')) continue;
      const { url } = await this.r2Storage.uploadFile(file, 'gallery');
      const photo = await this.prisma.userGalleryPhoto.create({
        data: { userId, src: url },
      });
      created.push({ id: photo.id, src: photo.src });
    }
    return { message: 'Gallery photos uploaded', photos: created };
  }

  async deleteGalleryPhoto(userId: string, photoId: string) {
    const photo = await this.prisma.userGalleryPhoto.findFirst({
      where: { id: photoId, userId },
    });
    if (!photo) throw new NotFoundException('Gallery photo not found');
    await this.prisma.userGalleryPhoto.delete({ where: { id: photoId } });
    return { message: 'Photo deleted' };
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

        const { photos, permissions, roleId, ...rest } = updateUserDto;
        const photoObjects =
          photos?.map((photo) => ({
            title: photo.title,
            src: photo.src,
          })) || [];

        const permissionsData = permissions
          ? { set: permissions.map((permissionId) => ({ id: permissionId })) }
          : undefined;

        const updateData: any = {
          ...rest,
          photos: photoObjects.length > 0 ? photoObjects : undefined,
          permissions: permissionsData,
        };

        if (roleId !== undefined) {
          updateData.roleId = roleId;
        }

        const userUpdate = await this.prisma.user.update({
          where: { id },
          data: updateData,
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

  // Authentication & Security Methods
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; otpExpiry: Date }> {
    const { email, method } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { email },
      data: {
        otp,
        otpExpiry,
        otpVerified: false,
      },
    });

    // TODO: Send OTP via SMS or email based on method
    console.log(`OTP for ${email} (${method || 'email'}): ${otp}`);

    return {
      message: `OTP sent to your ${method || 'email'}`,
      otpExpiry,
    };
  }

  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string; resetToken: string }> {
    const { email, otp } = verifyOtpDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException('No OTP request found');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP has expired');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { email, purpose: 'reset-password' },
      this.configService.get('JWT_SECRET'),
      { expiresIn: '15m' },
    );

    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: {
        otpVerified: true,
        resetToken,
        resetTokenExpiry,
      },
    });

    return { message: 'OTP verified successfully', resetToken };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { email, resetToken, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.resetToken || user.resetToken !== resetToken) {
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw new BadRequestException('Reset token has expired');
    }

    if (!user.otpVerified) {
      throw new BadRequestException('OTP not verified');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
        otpVerified: false,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async setPin(setPinDto: SetPinDto): Promise<{ message: string }> {
    const { userId, pin } = setPinDto;

    // Validate PIN is exactly 5 digits
    if (!/^\d{5}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 5 digits');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pin: hashedPin,
        pinPlainText: pin, // Store plain text for display (in production, encrypt this)
      },
    });

    return { message: 'PIN set successfully' };
  }

  async verifyPin(
    verifyPinDto: VerifyPinDto,
  ): Promise<{ message: string; pin: string }> {
    const { userId, password } = verifyPinDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.pin || !user.pinPlainText) {
      throw new BadRequestException('No PIN set for this user');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Incorrect password');
    }

    // Password verified, return the plain text PIN
    return {
      message: 'Password verified successfully',
      pin: user.pinPlainText,
    };
  }

  async setFingerprint(
    setFingerprintDto: SetFingerprintDto,
  ): Promise<{ message: string }> {
    const { userId, fingerprintEnabled } = setFingerprintDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { fingerprintEnabled },
    });

    return {
      message: `Fingerprint authentication ${fingerprintEnabled ? 'enabled' : 'disabled'} successfully`,
    };
  }

  async updateRememberMe(
    updateRememberMeDto: UpdateRememberMeDto,
  ): Promise<{ message: string }> {
    const { userId, rememberMe } = updateRememberMeDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { rememberMe },
    });

    return { message: 'Remember me preference updated successfully' };
  }

  async changePassword(
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { userId, currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}
