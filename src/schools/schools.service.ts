import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import * as bcrypt from 'bcrypt';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class SchoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createSchoolAndManager(createSchoolDto: CreateSchoolDto) {
    const { email, name, location, photos, password } = createSchoolDto;

    const photoObjects =
      photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const school = await this.prisma.school.create({
      data: {
        name,
        email,
        location,
        photos: photoObjects,
        password: hashedPassword,
      },
    });

    const manager = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'schoolManager',
      },
    });

    return { message: 'school created successfully', school: school, manager };
  }
  async getSchool(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number; totalStudents: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const totalCountPromise = this.prisma.school.count();

    const dataPromise = await this.prisma.school.findMany({
      skip,
      take: perPageNumber,
      include: { students: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalStudents = dataPromise.reduce(
      (total, school) => total + school.students.length,
      0,
    );
    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);
    return { data, total, totalStudents };
  }

  async getSingleSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { students: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }

  async getSchoolManager(email: string) {
    if (!email) {
      throw new BadRequestException('Email parameter is required');
    }

    const schools = await this.prisma.school.findMany({
      where: { email },
      include: { students: true },
    });

    if (!schools.length) {
      throw new NotFoundException('No schools found for the provided email');
    }

    return schools;
  }

  async deleteSchool(id: string) {
    const school = await this.prisma.school.delete({ where: { id } });
    return school;
  }

  async update(id: string, updateSchoolDto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    const { photos, ...updateData } = updateSchoolDto;

    const photoObjects =
      photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const updatePayload: any = {
      ...updateData,
    };

    const schoolUpdate = await this.prisma.school.update({
      where: { id },
      data: {
        photos: photoObjects.length > 0 ? photoObjects : undefined,
        ...updatePayload,
      },
    });

    await this.auditLogService.log(
      id,
      'School',
      'UPDATE',
      school,
      schoolUpdate,
    );
    return { message: 'School updated successfully', schoolUpdate };
  }
}
