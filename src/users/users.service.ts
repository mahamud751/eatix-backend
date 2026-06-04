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
  ReactivateAccountDto,
} from './dto/forgot-password.dto';
import {
  SetPinDto,
  VerifyPinDto,
  SetFingerprintDto,
  UpdateRememberMeDto,
} from './dto/set-pin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { SocialLoginDto } from './dto/social-login.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly r2Storage: R2StorageService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private normalizeEmail(email: string): string {
    return String(email || '').trim().toLowerCase();
  }

  private async findUserByEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;
    return this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
  }

  private createMailTransporter() {
    const smtpUser =
      this.configService.get<string>('GMAIL_USER') ||
      this.configService.get<string>('SMTP_USER') ||
      this.configService.get<string>('MAIL_USER') ||
      this.configService.get<string>('EMAIL_USER');
    const smtpPassRaw =
      this.configService.get<string>('GMAIL_APP_PASSWORD') ||
      this.configService.get<string>('SMTP_PASS') ||
      this.configService.get<string>('MAIL_PASS') ||
      this.configService.get<string>('EMAIL_PASS');
    const smtpPass = String(smtpPassRaw || '').replace(/\s/g, '');
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = Number(this.configService.get<string>('SMTP_PORT') || 0);
    const smtpSecure =
      String(this.configService.get<string>('SMTP_SECURE') || '').toLowerCase() ===
      'true';
    const mailFrom =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SMTP_FROM') ||
      smtpUser;

    if (!smtpUser || !smtpPass) {
      throw new BadRequestException(
        'Email service is not configured. Set GMAIL_USER/GMAIL_APP_PASSWORD (or SMTP_USER/SMTP_PASS).',
      );
    }

    const transporter =
      smtpHost && smtpPort
        ? nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: { user: smtpUser, pass: smtpPass },
          })
        : nodemailer.createTransport({
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass },
          });

    return { transporter, mailFrom };
  }

  private async sendOtpEmailMessage(
    email: string,
    otp: string,
    subject: string,
    introText: string,
  ) {
    try {
      const { transporter, mailFrom } = this.createMailTransporter();
      await transporter.sendMail({
        from: mailFrom,
        to: email,
        subject,
        html: `<p>${introText}</p><p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`,
      });
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to send OTP email. Check SMTP/Gmail credentials and app password.',
      );
    }
  }

  private async sendVerificationOtpEmail(email: string, otp: string) {
    await this.sendOtpEmailMessage(
      email,
      otp,
      'Verify your email - OTP',
      'Your verification OTP is',
    );
  }

  private static readonly PUBLIC_SIGNUP_ROLES = ['user', 'owner', 'vendor'];

  private normalizeRoleName(inputRole?: string): string {
    const normalized = String(inputRole || '')
      .trim()
      .toLowerCase();
    const roleAliases: Record<string, string> = {
      user: 'user',
      owner: 'owner',
      vendor: 'vendor',
      admin: 'admin',
      superadmin: 'superAdmin',
      manager: 'manager',
      rider: 'rider',
      schoolmanager: 'schoolManager',
      b2bmanager: 'b2bManager',
      franchise: 'franchise',
      employee: 'employee',
      client: 'client',
    };

    if (!normalized) return 'user';
    return roleAliases[normalized] || String(inputRole || '').trim();
  }

  private validatePasswordStrength(password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new BadRequestException(
        'Password must include uppercase, lowercase, and number',
      );
    }
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<{ user: any; token?: string; requiresEmailVerification?: boolean }> {
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

    let roleName = this.normalizeRoleName(role);
    let finalRoleId: string | undefined = roleId;
    if (roleId) {
      const roleRecord = await this.prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!roleRecord) {
        const roleIdAsName = String(roleId).toLowerCase();
        if (UsersService.PUBLIC_SIGNUP_ROLES.includes(roleIdAsName)) {
          roleName = this.normalizeRoleName(roleIdAsName);
          finalRoleId = undefined;
        } else {
          throw new BadRequestException(
            'Invalid role selected. Please refresh and try again.',
          );
        }
      } else {
        roleName = this.normalizeRoleName(roleRecord.name);
        finalRoleId = roleRecord.id;
      }
    } else if (roleName) {
      const roleRecordByName = await this.prisma.role.findFirst({
        where: { name: { equals: roleName, mode: 'insensitive' } },
      });
      if (roleRecordByName) {
        finalRoleId = roleRecordByName.id;
        roleName = this.normalizeRoleName(roleRecordByName.name);
      }
    }

    const isSimpleSignup =
      !nationalId &&
      !businessName &&
      !departmentId &&
      !branch &&
      !tradeLicense;
    if (
      isSimpleSignup &&
      !UsersService.PUBLIC_SIGNUP_ROLES.includes(
        String(roleName || 'user').toLowerCase(),
      )
    ) {
      throw new BadRequestException(
        'Registration is only available for User, Owner, and Vendor accounts.',
      );
    }

    // Auto-assign password for employees and franchises
    let passwordToUse = password;
    if (
      !password &&
      (roleName === 'employee' ||
        roleName === 'franchise' ||
        roleName === 'user' ||
        !roleName)
    ) {
      passwordToUse = '123456Aa';
    }

    let hashedPassword: string | undefined;
    if (passwordToUse) {
      this.validatePasswordStrength(passwordToUse);
      hashedPassword = await bcrypt.hash(passwordToUse, 10);
    }

    // Require email verification for app-facing self-signup roles.
    const requiresEmailVerification = ['user', 'owner', 'vendor'].includes(
      String(roleName || '').toLowerCase(),
    );

    // Set initial status to 'pending' for employee, franchise, and client
    const initialStatus =
      roleName === 'employee' ||
      roleName === 'franchise' ||
      roleName === 'client'
        ? 'pending'
        : requiresEmailVerification
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
        ...(requiresEmailVerification
          ? {
              otp: Math.floor(10000 + Math.random() * 90000).toString(),
              otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
              otpVerified: false,
            }
          : {}),
      },
      include: { permissions: true },
    });

    if (requiresEmailVerification) {
      await this.sendVerificationOtpEmail(email, String(user.otp || ''));
    }

    const token = requiresEmailVerification
      ? undefined
      : jwt.sign(
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
      roleId: user.roleId,
      employeeId: user.employeeId,
      interests: user.interests || [],
      permissions: user.permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      })),
    };

    return {
      user: userData,
      ...(token ? { token } : {}),
      ...(requiresEmailVerification ? { requiresEmailVerification: true } : {}),
    };
  }

  async loginUser(
    loginUserDto: LoginUserDto,
  ): Promise<{ token: string; user: Partial<any> }> {
    const { email, password } = loginUserDto;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        branch: true,
        permissions: true,
        roleModel: true,
        clientBusiness: true,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'blocked' || user.status === 'deactive') {
      throw new UnauthorizedException(
        'ACCOUNT_INACTIVE: Your account is blocked or deactivated. Use Forgot Password to recover your account.',
      );
    }

    if (user.status === 'pending') {
      throw new UnauthorizedException(
        'ACCOUNT_PENDING: Your account is pending email verification. Check your email or use Forgot Password.',
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userData = {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      address: user.address,
      postcode: user.postcode ?? undefined,
      latitude: user.latitude ?? undefined,
      longitude: user.longitude ?? undefined,
      role: user.role,
      roleId: user.roleId,
      employeeId: user.employeeId,
      pin: user.pin ? true : false, // Only return if PIN exists (not the actual value)
      photos: user.photos ?? [],
      channelAbout: user.channelAbout ?? undefined,
      socialLinks: user.socialLinks ?? undefined,
      savedLastLocation: (user as any).savedLastLocation ?? undefined,
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
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        branch: true,
        permissions: true,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
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
      throw new UnauthorizedException('Invalid email or password');
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

  async socialLogin(
    dto: SocialLoginDto,
  ): Promise<{ token: string; user: Partial<any> }> {
    const provider = String(dto.provider || '').toLowerCase();
    let providerId = '';
    let email = '';
    let name = '';

    if (provider === 'google') {
      if (!dto.idToken) {
        throw new BadRequestException('Google idToken is required');
      }
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
          dto.idToken,
        )}`,
      );
      if (!res.ok) {
        throw new BadRequestException('Invalid Google token');
      }
      const profile = (await res.json()) as any;
      providerId = String(profile.sub || '');
      email = String(profile.email || '').toLowerCase().trim();
      name = String(profile.name || '').trim();
      if (!providerId || !email) {
        throw new BadRequestException('Google profile is incomplete');
      }
    } else if (provider === 'facebook') {
      if (!dto.accessToken) {
        throw new BadRequestException('Facebook accessToken is required');
      }
      const res = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(
          dto.accessToken,
        )}`,
      );
      if (!res.ok) {
        throw new BadRequestException('Invalid Facebook token');
      }
      const profile = (await res.json()) as any;
      providerId = String(profile.id || '');
      email = String(profile.email || '').toLowerCase().trim();
      name = String(profile.name || '').trim();
      if (!providerId) {
        throw new BadRequestException('Facebook profile is incomplete');
      }
      if (!email) {
        email = `fb_${providerId}@facebook.eatix.app`;
      }
    } else {
      throw new BadRequestException('Unsupported social provider');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { provider, providerId },
          { email },
        ],
      },
      include: {
        branch: true,
        permissions: true,
        roleModel: true,
        clientBusiness: true,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          role: 'user',
          status: 'active',
          provider,
          providerId,
        },
        include: {
          branch: true,
          permissions: true,
          roleModel: true,
          clientBusiness: true,
        },
      });
    } else if (user.provider !== provider || user.providerId !== providerId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider,
          providerId,
          ...(name && !user.name ? { name } : {}),
          ...(String(user.status || '').toLowerCase() !== 'active'
            ? { status: 'active' as any }
            : {}),
        },
        include: {
          branch: true,
          permissions: true,
          roleModel: true,
          clientBusiness: true,
        },
      });
    }

    if (user.status === 'blocked' || user.status === 'deactive') {
      throw new UnauthorizedException(
        'User is blocked or deactivated and cannot log in',
      );
    }
    if (user.status === 'pending') {
      throw new UnauthorizedException(
        'Your account is pending approval or email verification.',
      );
    }

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
      postcode: user.postcode ?? undefined,
      latitude: user.latitude ?? undefined,
      longitude: user.longitude ?? undefined,
      role: user.role,
      roleId: user.roleId,
      employeeId: user.employeeId,
      pin: user.pin ? true : false,
      photos: user.photos ?? [],
      channelAbout: user.channelAbout ?? undefined,
      socialLinks: user.socialLinks ?? undefined,
      savedLastLocation: (user as any).savedLastLocation ?? undefined,
      interests: user.interests || [],
      branch: user.branch,
      clientBusiness: user.clientBusiness,
      permissions: user.permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      })),
    };

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
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
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
          OR: [
            { scheduledPublishAt: null },
            { scheduledPublishAt: { lte: new Date() } },
          ],
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
        email: true,
        phone: true,
        phoneNumber: true,
        channelAbout: true,
        coverUrl: true,
        photos: true,
        createdAt: true,
        address: true,
        latitude: true,
        longitude: true,
        socialLinks: true,
        openingHours: true,
        role: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      videoCount,
      shortCount,
      totalVideoViews,
      totalShortViews,
      subscriberCount,
      followingCount,
      isSubscribed,
      ownerReviewAgg,
    ] = await Promise.all([
      this.prisma.video.count({
        where: {
          userId,
          status: { not: 'deleted' },
          visibility: 'public',
          OR: [
            { scheduledPublishAt: null },
            { scheduledPublishAt: { lte: new Date() } },
          ],
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
      (this.prisma as any).restaurantOrderReview.aggregate({
        where: { ownerId: userId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const totalViews =
      (totalVideoViews._sum.viewCount ?? 0) +
      (totalShortViews._sum.viewCount ?? 0);
    const averageRating = Number(ownerReviewAgg?._avg?.rating ?? 0);
    const reviewCount = Number(ownerReviewAgg?._count?._all ?? 0);

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
      email: user.email,
      phone: user.phone ?? user.phoneNumber ?? undefined,
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
      openingHours: user.openingHours ?? undefined,
      role: user.role ?? 'user',
      videoCount,
      shortCount,
      totalViews,
      subscriberCount,
      followingCount,
      isSubscribed,
      averageRating,
      reviewCount,
      ratingAverage: averageRating,
      ratingAvg: averageRating,
      rating: averageRating,
      reviewsCount: reviewCount,
      totalReviews: reviewCount,
      ratingCount: reviewCount,
    };
  }

  /**
   * Paginated restaurant order reviews left for a channel (owner).
   * Public: anyone can read reviews for transparency.
   */
  async getChannelOrderReviews(
    ownerId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Array<{
      id: string;
      orderId: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
      user: {
        id: string;
        name: string;
        nickname: string | null;
        avatar: string | null;
      };
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!user) throw new NotFoundException('User not found');

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const prismaAny = this.prisma as any;
    const [rows, total] = await Promise.all([
      prismaAny.restaurantOrderReview.findMany({
        where: { ownerId },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
              photos: true,
            },
          },
        },
      }),
      prismaAny.restaurantOrderReview.count({ where: { ownerId } }),
    ]);

    const items = rows.map((r: any) => {
      const u = r.user;
      const p0 = Array.isArray(u?.photos) && u.photos.length > 0 ? u.photos[0] : null;
      const avatarSrc =
        typeof p0 === 'string'
          ? p0
          : p0 && typeof p0 === 'object' && 'src' in p0
            ? (p0 as { src?: string }).src
            : null;
      const displayName =
        (u?.nickname && String(u.nickname).trim()) ||
        (u?.name && String(u.name).trim()) ||
        u?.email ||
        'Customer';
      return {
        id: r.id,
        orderId: r.orderId,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        user: {
          id: u.id,
          name: displayName,
          nickname: u.nickname ?? null,
          avatar: avatarSrc && String(avatarSrc).trim().length > 0 ? String(avatarSrc).trim() : null,
        },
      };
    });

    return { items, total, page: safePage, limit: safeLimit };
  }

  async getChannelFollowers(
    channelUserId: string,
    currentUserId?: string,
    page = 1,
    limit = 50,
  ): Promise<{
    items: Array<{
      userId: string;
      name: string;
      nickname: string | null;
      channelName: string;
      channelAvatar: string;
      isSubscribed: boolean;
    }>;
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [total, rows] = await Promise.all([
      this.prisma.channelSubscription.count({ where: { channelUserId } }),
      this.prisma.channelSubscription.findMany({
        where: { channelUserId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          subscriberId: true,
          subscriber: {
            select: { id: true, name: true, nickname: true, photos: true },
          },
        },
      }),
    ]);

    const followerIds = rows
      .map((r) => r.subscriberId)
      .filter((id) => typeof id === 'string' && id.length > 0);

    const subscribedByCurrent = currentUserId
      ? await this.prisma.channelSubscription.findMany({
          where: {
            subscriberId: currentUserId,
            channelUserId: { in: followerIds },
          },
          select: { channelUserId: true },
        })
      : [];
    const subscribedSet = new Set(subscribedByCurrent.map((s) => s.channelUserId));

    const items = rows.map((r) => {
      const u = r.subscriber;
      const channelName = u?.nickname || u?.name || 'Unknown';
      const firstPhoto = Array.isArray(u?.photos) ? u.photos[0] : null;
      const rawSrc =
        firstPhoto && typeof firstPhoto === 'object' && 'src' in firstPhoto
          ? (firstPhoto as { src?: string }).src
          : null;
      const channelAvatar =
        typeof rawSrc === 'string' && rawSrc.trim().length > 0
          ? rawSrc.trim()
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
              channelName,
            )}&background=111&color=fff`;
      return {
        userId: u?.id || r.subscriberId,
        name: u?.name || channelName,
        nickname: u?.nickname ?? null,
        channelName,
        channelAvatar,
        isSubscribed: currentUserId ? subscribedSet.has(u?.id || r.subscriberId) : false,
      };
    });

    return {
      items,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getChannelFollowing(
    userId: string,
    currentUserId?: string,
    page = 1,
    limit = 50,
  ): Promise<{
    items: Array<{
      userId: string;
      name: string;
      nickname: string | null;
      channelName: string;
      channelAvatar: string;
      isSubscribed: boolean;
    }>;
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [total, rows] = await Promise.all([
      this.prisma.channelSubscription.count({ where: { subscriberId: userId } }),
      this.prisma.channelSubscription.findMany({
        where: { subscriberId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          channelUserId: true,
          channelUser: {
            select: { id: true, name: true, nickname: true, photos: true },
          },
        },
      }),
    ]);

    const channelIds = rows
      .map((r) => r.channelUserId)
      .filter((id) => typeof id === 'string' && id.length > 0);

    const subscribedByCurrent = currentUserId
      ? await this.prisma.channelSubscription.findMany({
          where: {
            subscriberId: currentUserId,
            channelUserId: { in: channelIds },
          },
          select: { channelUserId: true },
        })
      : [];
    const subscribedSet = new Set(subscribedByCurrent.map((s) => s.channelUserId));

    const items = rows.map((r) => {
      const u = r.channelUser;
      const channelName = u?.nickname || u?.name || 'Unknown';
      const firstPhoto = Array.isArray(u?.photos) ? u.photos[0] : null;
      const rawSrc =
        firstPhoto && typeof firstPhoto === 'object' && 'src' in firstPhoto
          ? (firstPhoto as { src?: string }).src
          : null;
      const channelAvatar =
        typeof rawSrc === 'string' && rawSrc.trim().length > 0
          ? rawSrc.trim()
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
              channelName,
            )}&background=111&color=fff`;
      return {
        userId: u?.id || r.channelUserId,
        name: u?.name || channelName,
        nickname: u?.nickname ?? null,
        channelName,
        channelAvatar,
        isSubscribed: currentUserId
          ? subscribedSet.has(u?.id || r.channelUserId)
          : false,
      };
    });

    return {
      items,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async subscribeToChannel(
    subscriberId: string,
    channelUserId: string,
  ): Promise<{ subscribed: boolean }> {
    if (!subscriberId || !channelUserId) {
      throw new BadRequestException(
        'subscriberId and channelUserId are required',
      );
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
      throw new BadRequestException(
        'subscriberId and channelUserId are required',
      );
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
      postcode,
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
    if (postcode !== undefined) updateData.postcode = postcode;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (status !== undefined) updateData.status = status;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessAddress !== undefined)
      updateData.businessAddress = businessAddress;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks as any;

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

  async updateSavedLastLocation(
    userId: string,
    payload: { lat: number; lng: number; addressText?: string },
  ) {
    const { lat, lng, addressText, postcode, areaLabel } = payload;
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng))
    ) {
      throw new BadRequestException('lat and lng are required and must be numbers');
    }
    const savedLastLocation = {
      lat: Number(lat),
      lng: Number(lng),
      addressText: addressText ?? '',
      postcode: postcode ?? '',
      areaLabel: areaLabel ?? '',
      savedAt: Date.now(),
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { savedLastLocation: savedLastLocation as any },
    });
    return { savedLastLocation };
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

  async getGallery(userId: string, viewerId?: string) {
    const photos = await this.prisma.userGalleryPhoto.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    let likedIds = new Set<string>();
    let dislikedIds = new Set<string>();
    if (viewerId && photos.length) {
      const ids = photos.map((p) => p.id);
      const [likes, dislikes] = await Promise.all([
        this.prisma.galleryPhotoLike.findMany({
          where: { userId: viewerId, photoId: { in: ids } },
          select: { photoId: true },
        }),
        this.prisma.galleryPhotoDislike.findMany({
          where: { userId: viewerId, photoId: { in: ids } },
          select: { photoId: true },
        }),
      ]);
      likedIds = new Set(likes.map((l) => l.photoId));
      dislikedIds = new Set(dislikes.map((d) => d.photoId));
    }
    return {
      photos: photos.map((p) => ({
        ...p,
        isLiked: likedIds.has(p.id),
        isDisliked: dislikedIds.has(p.id),
      })),
    };
  }

  async toggleGalleryPhotoLike(
    channelUserId: string,
    photoId: string,
    viewerId: string,
  ) {
    const photo = await this.prisma.userGalleryPhoto.findFirst({
      where: { id: photoId, userId: channelUserId },
    });
    if (!photo) throw new NotFoundException('Gallery photo not found');

    const existing = await this.prisma.galleryPhotoLike.findUnique({
      where: { photoId_userId: { photoId, userId: viewerId } },
    });

    if (existing) {
      await this.prisma.galleryPhotoLike.delete({ where: { id: existing.id } });
      await this.prisma.userGalleryPhoto.update({
        where: { id: photoId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    }

    const existingDislike = await this.prisma.galleryPhotoDislike.findUnique({
      where: { photoId_userId: { photoId, userId: viewerId } },
    });
    if (existingDislike) {
      await this.prisma.galleryPhotoDislike.delete({
        where: { id: existingDislike.id },
      });
      await this.prisma.userGalleryPhoto.update({
        where: { id: photoId },
        data: { dislikeCount: { decrement: 1 } },
      });
    }

    await this.prisma.galleryPhotoLike.create({
      data: { photoId, userId: viewerId },
    });
    await this.prisma.userGalleryPhoto.update({
      where: { id: photoId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true };
  }

  async toggleGalleryPhotoDislike(
    channelUserId: string,
    photoId: string,
    viewerId: string,
  ) {
    const photo = await this.prisma.userGalleryPhoto.findFirst({
      where: { id: photoId, userId: channelUserId },
    });
    if (!photo) throw new NotFoundException('Gallery photo not found');

    const existing = await this.prisma.galleryPhotoDislike.findUnique({
      where: { photoId_userId: { photoId, userId: viewerId } },
    });

    if (existing) {
      await this.prisma.galleryPhotoDislike.delete({
        where: { id: existing.id },
      });
      await this.prisma.userGalleryPhoto.update({
        where: { id: photoId },
        data: { dislikeCount: { decrement: 1 } },
      });
      return { disliked: false };
    }

    const existingLike = await this.prisma.galleryPhotoLike.findUnique({
      where: { photoId_userId: { photoId, userId: viewerId } },
    });
    if (existingLike) {
      await this.prisma.galleryPhotoLike.delete({ where: { id: existingLike.id } });
      await this.prisma.userGalleryPhoto.update({
        where: { id: photoId },
        data: { likeCount: { decrement: 1 } },
      });
    }

    await this.prisma.galleryPhotoDislike.create({
      data: { photoId, userId: viewerId },
    });
    await this.prisma.userGalleryPhoto.update({
      where: { id: photoId },
      data: { dislikeCount: { increment: 1 } },
    });
    return { disliked: true };
  }

  async recordGalleryPhotoShare(channelUserId: string, photoId: string) {
    const photo = await this.prisma.userGalleryPhoto.findFirst({
      where: { id: photoId, userId: channelUserId },
    });
    if (!photo) throw new NotFoundException('Gallery photo not found');
    await this.prisma.userGalleryPhoto.update({
      where: { id: photoId },
      data: { shareCount: { increment: 1 } },
    });
    return { message: 'Share recorded' };
  }

  async getGalleryPhotoComments(
    channelUserId: string,
    photoId: string,
    page = 1,
    limit = 20,
  ) {
    const photo = await this.prisma.userGalleryPhoto.findFirst({
      where: { id: photoId, userId: channelUserId },
    });
    if (!photo) throw new NotFoundException('Gallery photo not found');
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      this.prisma.galleryPhotoComment.findMany({
        where: { photoId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              name: true,
              photos: true,
            },
          },
        },
      }),
      this.prisma.galleryPhotoComment.count({ where: { photoId } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      comments: rows,
      pagination: { page, totalPages, total },
    };
  }

  async addGalleryPhotoComment(
    channelUserId: string,
    photoId: string,
    userId: string,
    content: string,
  ) {
    const photo = await this.prisma.userGalleryPhoto.findFirst({
      where: { id: photoId, userId: channelUserId },
    });
    if (!photo) throw new NotFoundException('Gallery photo not found');
    const comment = await this.prisma.galleryPhotoComment.create({
      data: { photoId, userId, content },
      include: {
        user: {
          select: { id: true, nickname: true, name: true, photos: true },
        },
      },
    });
    await this.prisma.userGalleryPhoto.update({
      where: { id: photoId },
      data: { commentCount: { increment: 1 } },
    });
    return comment;
  }

  async deleteGalleryPhotoComment(commentId: string, userId: string) {
    const c = await this.prisma.galleryPhotoComment.findUnique({
      where: { id: commentId },
    });
    if (!c) throw new NotFoundException('Comment not found');
    if (c.userId !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }
    await this.prisma.galleryPhotoComment.delete({ where: { id: commentId } });
    await this.prisma.userGalleryPhoto.update({
      where: { id: c.photoId },
      data: { commentCount: { decrement: 1 } },
    });
    return { message: 'Comment deleted' };
  }

  async uploadGallery(userId: string, files: Express.Multer.File[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!files?.length)
      throw new BadRequestException('At least one image is required');
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
    const normalizedEmail = this.normalizeEmail(email);

    const user = await this.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deliveryMethod = method || 'email';
    if (deliveryMethod === 'sms') {
      throw new BadRequestException(
        'SMS OTP is not configured yet. Please use email recovery.',
      );
    }

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry,
        otpVerified: false,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await this.sendVerificationOtpEmail(user.email, otp);

    return {
      message: `OTP sent to your ${deliveryMethod}`,
      otpExpiry,
    };
  }

  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string; resetToken: string }> {
    const { email, otp } = verifyOtpDto;

    const user = await this.findUserByEmail(email);
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
    const resetToken = crypto.randomBytes(32).toString('hex');

    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpVerified: true,
        otp: null,
        otpExpiry: null,
        resetToken,
        resetTokenExpiry,
      },
    });

    return { message: 'OTP verified successfully', resetToken };
  }

  async requestEmailVerificationOtp(email: string): Promise<{ message: string; otpExpiry: Date }> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const role = String(user.role || '').toLowerCase();
    if (!['user', 'owner', 'vendor'].includes(role)) {
      throw new BadRequestException('Email verification not available for this account type');
    }

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry,
        otpVerified: false,
      },
    });

    await this.sendVerificationOtpEmail(user.email, otp);
    return { message: 'Verification OTP sent to email', otpExpiry };
  }

  async verifyEmailVerificationOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string; token: string; user: Partial<any> }> {
    const { email, otp } = verifyOtpDto;
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: this.normalizeEmail(email), mode: 'insensitive' } },
      include: { permissions: true, branch: true, clientBusiness: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const role = String(user.role || '').toLowerCase();
    if (!['user', 'owner', 'vendor'].includes(role)) {
      throw new BadRequestException('Email verification not available for this account type');
    }
    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException('No OTP request found');
    }
    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP has expired');
    }
    if (String(user.otp) !== String(otp)) {
      throw new BadRequestException('Invalid OTP');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpVerified: true,
        otp: null,
        otpExpiry: null,
        ...(String(user.status || '').toLowerCase() === 'pending'
          ? { status: 'active' as any }
          : {}),
      },
      include: {
        branch: true,
        permissions: true,
        roleModel: true,
        clientBusiness: true,
      },
    });

    const token = jwt.sign(
      { userId: updated.id, email: updated.email },
      this.configService.get('JWT_SECRET'),
      { expiresIn: '1h' },
    );

    const userData = {
      id: updated.id,
      name: updated.name,
      nickname: updated.nickname,
      email: updated.email,
      phone: updated.phone,
      gender: updated.gender,
      address: updated.address,
      latitude: updated.latitude ?? undefined,
      longitude: updated.longitude ?? undefined,
      role: updated.role,
      roleId: updated.roleId,
      employeeId: updated.employeeId,
      pin: updated.pin ? true : false,
      photos: updated.photos ?? [],
      channelAbout: updated.channelAbout ?? undefined,
      socialLinks: updated.socialLinks ?? undefined,
      savedLastLocation: (updated as any).savedLastLocation ?? undefined,
      interests: updated.interests || [],
      branch: updated.branch,
      clientBusiness: updated.clientBusiness,
      permissions: updated.permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      })),
    };

    return { message: 'Email verified successfully', token, user: userData };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { email, resetToken, newPassword, confirmPassword } = resetPasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }
    this.validatePasswordStrength(newPassword);


    const user = await this.findUserByEmail(email);
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
      where: { id: user.id },
      data: {
        password: hashedPassword,
        ...(String(user.status || '').toLowerCase() === 'blocked' ||
        String(user.status || '').toLowerCase() === 'deactive'
          ? { status: 'active' as any }
          : {}),
        otp: null,
        otpExpiry: null,
        otpVerified: false,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async reactivateAccount(
    reactivateDto: ReactivateAccountDto,
  ): Promise<{ message: string }> {
    const { email, resetToken } = reactivateDto;
    const user = await this.findUserByEmail(email);
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'active' as any,
        otp: null,
        otpExpiry: null,
        otpVerified: false,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Account reactivated successfully' };
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
