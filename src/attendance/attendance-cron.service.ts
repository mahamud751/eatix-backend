import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service';

@Injectable()
export class AttendanceCronService {
  private readonly logger = new Logger(AttendanceCronService.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  // Run every day at 11:59 PM to generate absent records for today
  @Cron('59 23 * * *', {
    name: 'generate-daily-absent-records',
    timeZone: 'Asia/Dhaka', // Change to your timezone (e.g., 'Asia/Dhaka' for Bangladesh)
  })
  async handleDailyAbsentRecords() {
    this.logger.log('🕐 Starting daily absent record generation...');

    try {
      const result = await this.attendanceService.generateAbsentRecords();

      if (result.isWeekend) {
        this.logger.log(`⏭️  Skipped: ${result.message}`);
      } else {
        this.logger.log(
          `✅ Generated ${result.absentRecordsCreated} absent records for ${new Date(result.date).toLocaleDateString()}`,
        );
        this.logger.log(
          `📊 Stats: ${result.eligibleEmployees} eligible, ${result.employeesWithAttendance} present, ${result.skippedEmployees} skipped`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error generating absent records:', error);
    }
  }

  // Optional: Run every Monday at 1:00 AM to fill in any missed days from last week
  @Cron('0 1 * * 1', {
    name: 'weekly-absent-records-check',
    timeZone: 'Asia/Dhaka',
  })
  async handleWeeklyCheck() {
    this.logger.log('🔍 Running weekly absent records check...');

    try {
      // Get dates from 7 days ago to yesterday
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago

      const result = await this.attendanceService.generateAbsentRecordsForRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      );

      this.logger.log(
        `✅ Weekly check complete: ${result.totalAbsentRecordsCreated} records generated across ${result.totalDays} days`,
      );
    } catch (error) {
      this.logger.error('❌ Error in weekly check:', error);
    }
  }

  // Manual trigger endpoint (useful for testing)
  async triggerManual(date?: string) {
    this.logger.log(`🔧 Manual trigger for date: ${date || 'today'}`);
    return this.attendanceService.generateAbsentRecords(date);
  }
}
