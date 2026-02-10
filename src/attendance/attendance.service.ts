import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttendanceDto,
  AttendanceStatus,
} from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAttendanceDto: CreateAttendanceDto) {
    const { checkIn, checkOut, date, userId, ...rest } = createAttendanceDto;

    // Find user by UUID or employeeId
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // If not found by UUID, try finding by employeeId
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { employeeId: userId },
      });
    }

    if (!user) {
      throw new NotFoundException(
        `User not found with ID or Employee ID: ${userId}`,
      );
    }

    // Check if attendance already exists for this user and date
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // If attendance exists, update it with checkout time
    if (existingAttendance) {
      const updateData: any = {};

      // Only update checkOut if checkIn already exists (subsequent clock)
      if (existingAttendance.checkIn && checkIn) {
        updateData.checkOut = new Date(checkIn); // Use the new time as checkout
        
        // Only update status if it's not already set or if it's 'absent'
        // If already 'late', keep it as 'late'
        if (!existingAttendance.status || existingAttendance.status === 'absent') {
          const checkInTime = existingAttendance.checkIn;
          const bdTime = new Date(
            checkInTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
          );
          const hours = bdTime.getHours();
          const minutes = bdTime.getMinutes();
          const isLate = hours > 10 || (hours === 10 && minutes > 15);
          
          updateData.status = isLate ? 'late' : 'present';
        }
        // If status is already 'late' or 'present', keep it unchanged
      } else if (checkOut) {
        updateData.checkOut = new Date(checkOut);
        
        // Only update status if it's not already set or if it's 'absent'
        // If already 'late', keep it as 'late'
        if (existingAttendance.checkIn && (!existingAttendance.status || existingAttendance.status === 'absent')) {
          const checkInTime = existingAttendance.checkIn;
          const bdTime = new Date(
            checkInTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
          );
          const hours = bdTime.getHours();
          const minutes = bdTime.getMinutes();
          const isLate = hours > 10 || (hours === 10 && minutes > 15);
          
          updateData.status = isLate ? 'late' : 'present';
        }
        // If status is already 'late' or 'present', keep it unchanged
      }

      // If checkIn is being updated, check if late
      if (checkIn && !existingAttendance.checkIn) {
        updateData.checkIn = new Date(checkIn);

        // Auto-detect if late: Check-in after 10:15 AM (Bangladesh Time)
        const checkInTime = new Date(checkIn);

        // Convert to Bangladesh time (UTC+6)
        const bdTime = new Date(
          checkInTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        );
        const hours = bdTime.getHours();
        const minutes = bdTime.getMinutes();

        // Late threshold: 10:15 AM Bangladesh time
        const isLate = hours > 10 || (hours === 10 && minutes > 15);

        if (isLate) {
          updateData.status = 'late';
        } else if (existingAttendance.status === 'absent') {
          // Change from absent to present if checking in on time
          updateData.status = 'present';
        } else {
          // Set to present if checking in on time
          updateData.status = 'present';
        }
      }

      // Update status if provided (manual override)
      if (rest.status) {
        updateData.status = rest.status;
      }

      const attendance = await this.prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true,
              role: true,
              phone: true,
            },
          },
        },
      });

      return {
        message: 'Attendance updated successfully (checkout recorded)',
        attendance,
      };
    }

    // No existing attendance, create new record
    // Convert date strings to Date objects
    const attendanceData: any = {
      ...rest,
      userId: user.id, // Use the actual user UUID
      date: new Date(date),
    };

    if (checkIn) {
      attendanceData.checkIn = new Date(checkIn);

      // Auto-detect if late: Check-in after 10:15 AM (Bangladesh Time)
      const checkInTime = new Date(checkIn);

      // Convert to Bangladesh time (UTC+6)
      const bdTime = new Date(
        checkInTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
      );
      const hours = bdTime.getHours();
      const minutes = bdTime.getMinutes();

      // Late threshold: 10:15 AM Bangladesh time
      const isLate = hours > 10 || (hours === 10 && minutes > 15);

      if (isLate) {
        attendanceData.status = 'late';
      } else if (!rest.status) {
        attendanceData.status = 'present';
      }
    }

    if (checkOut) {
      attendanceData.checkOut = new Date(checkOut);
    }

    const attendance = await this.prisma.attendance.create({
      data: attendanceData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
            role: true,
            phone: true,
          },
        },
      },
    });

    return {
      message: 'Attendance created successfully (check-in recorded)',
      attendance,
    };
  }

  async findAll(
    userId?: string,
    date?: string,
    status?: AttendanceStatus,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    perPage: number = 100,
  ) {
    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: any = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;

    // Date filtering
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true,
              role: true,
              phone: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
            role: true,
            phone: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    return attendance;
  }

  async findByUser(userId: string, startDate?: string, endDate?: string) {
    const where: any = { userId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
            role: true,
            phone: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    await this.findOne(id); // Check if exists

    const { checkIn, checkOut, date, ...rest } = updateAttendanceDto;

    const updateData: any = { ...rest };

    if (date) {
      updateData.date = new Date(date);
    }

    if (checkIn) {
      updateData.checkIn = new Date(checkIn);
    }

    if (checkOut) {
      updateData.checkOut = new Date(checkOut);
    }

    const attendance = await this.prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
            role: true,
            phone: true,
          },
        },
      },
    });

    return {
      message: 'Attendance updated successfully',
      attendance,
    };
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    await this.prisma.attendance.delete({
      where: { id },
    });

    return {
      message: 'Attendance deleted successfully',
    };
  }

  // Get attendance statistics
  async getStats(userId?: string, startDate?: string, endDate?: string) {
    const where: any = {};

    if (userId) where.userId = userId;

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [total, present, absent, late, onLeave] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.count({ where: { ...where, status: 'present' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'absent' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'late' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'on_leave' } }),
    ]);

    return {
      total,
      present,
      absent,
      late,
      onLeave,
      presentPercentage: total > 0 ? ((present / total) * 100).toFixed(2) : '0',
      absentPercentage: total > 0 ? ((absent / total) * 100).toFixed(2) : '0',
    };
  }

  // Auto-generate absent records for employees who didn't clock in
  async generateAbsentRecords(date?: string) {
    // Use provided date or today
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Check if it's a working day (Monday-Friday, not a holiday)
    const dayOfWeek = startOfDay.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // 5 = Friday, 6 = Saturday (Your company's weekend)

    if (isWeekend) {
      return {
        message: `Skipped: ${new Date(startOfDay).toLocaleDateString()} is a weekend (Friday/Saturday)`,
        date: startOfDay,
        isWeekend: true,
        absentRecordsCreated: 0,
      };
    }

    // TODO: Add holiday check here if you have a holidays table
    // const isHoliday = await this.prisma.holiday.findFirst({
    //   where: {
    //     date: {
    //       gte: startOfDay,
    //       lte: endOfDay,
    //     },
    //   },
    // });
    // if (isHoliday) {
    //   return {
    //     message: `Skipped: ${new Date(startOfDay).toLocaleDateString()} is a holiday`,
    //     date: startOfDay,
    //     isHoliday: true,
    //     holidayName: isHoliday.name,
    //     absentRecordsCreated: 0,
    //   };
    // }

    // Get all active employees
    const activeEmployees = await this.prisma.user.findMany({
      where: {
        role: 'employee',
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        createdAt: true, // Get employee join date
      },
    });

    // Get existing attendance records for this date
    const existingAttendance = await this.prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        userId: true,
      },
    });

    const employeesWithAttendance = new Set(
      existingAttendance.map((a) => a.userId),
    );

    // Filter employees who should have attendance for this date
    // Only include employees who joined on or before this date
    const eligibleEmployees = activeEmployees.filter((emp) => {
      const joinDate = new Date(emp.createdAt);
      joinDate.setHours(0, 0, 0, 0);
      return joinDate <= startOfDay;
    });

    const skippedEmployees = activeEmployees.length - eligibleEmployees.length;

    // Find eligible employees without attendance
    const employeesWithoutAttendance = eligibleEmployees.filter(
      (emp) => !employeesWithAttendance.has(emp.id),
    );

    // Create absent records for employees without attendance
    const absentRecords = await Promise.all(
      employeesWithoutAttendance.map((emp) =>
        this.prisma.attendance.create({
          data: {
            userId: emp.id,
            date: startOfDay,
            status: 'absent',
            checkIn: null,
            checkOut: null,
            notes: 'Auto-generated: No attendance recorded',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                email: true,
                role: true,
                phone: true,
              },
            },
          },
        }),
      ),
    );

    return {
      message: `Generated ${absentRecords.length} absent records for ${new Date(startOfDay).toLocaleDateString()}`,
      date: startOfDay,
      dayOfWeek: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ][dayOfWeek],
      isWorkingDay: true,
      totalActiveEmployees: activeEmployees.length,
      eligibleEmployees: eligibleEmployees.length,
      skippedEmployees: skippedEmployees, // Employees who joined after this date
      employeesWithAttendance: employeesWithAttendance.size,
      absentRecordsCreated: absentRecords.length,
      records: absentRecords,
    };
  }

  // Generate absent records for a date range
  async generateAbsentRecordsForRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];

    // Loop through each day in the range
    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      const result = await this.generateAbsentRecords(
        date.toISOString().split('T')[0],
      );
      results.push(result);
    }

    const totalAbsentRecords = results.reduce(
      (sum, r) => sum + r.absentRecordsCreated,
      0,
    );

    return {
      message: `Generated absent records for date range ${startDate} to ${endDate}`,
      startDate,
      endDate,
      totalDays: results.length,
      totalAbsentRecordsCreated: totalAbsentRecords,
      dailyResults: results,
    };
  }
}
