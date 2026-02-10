import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuditLogService } from '../audit/audit.service';
import { UserInfoDto } from 'src/products/dto/user-info.dts';

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    const { schoolId, ...studentData } = createStudentDto;

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const student = await this.prisma.student.create({
      data: {
        ...studentData,
        school: {
          connect: { id: schoolId },
        },
      },
    });

    return { message: 'Student created successfully', student };
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
    schoolId?: string,
    email?: string, // Added email parameter
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;
    const skip = (pageNumber - 1) * perPageNumber;

    // Count total number of students
    const totalCountPromise = this.prisma.student.count({
      where: schoolId ? { schoolId } : {},
    });

    // Fetch the paginated student data
    const dataPromise = this.prisma.student.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
      where: schoolId ? { schoolId } : {},
      include: {
        school: true,
      },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    // Apply email filtering if email is provided
    const filteredData = email
      ? data.filter((student) => {
          const userInfo = student.school as UserInfoDto; // Adjust if the structure differs
          return userInfo?.email ? userInfo.email.includes(email) : false;
        })
      : data;

    // Recalculate total if email filter is applied
    const filteredTotal = email ? filteredData.length : total;

    return { data: filteredData, total: filteredTotal };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        school: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id },
      data: updateStudentDto,
    });

    await this.auditLogService.log(
      id,
      'Student',
      'UPDATE',
      student,
      updatedStudent,
    );

    return { message: 'Student updated successfully', updatedStudent };
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.student.delete({
      where: { id },
    });
  }
}
