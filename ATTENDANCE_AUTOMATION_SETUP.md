# 🤖 Attendance Automation Setup Guide

## Overview

Automatically generate "absent" records for employees who didn't clock in on working days.

## ✅ What's Included

### 1. Backend API Endpoints

- `POST /attendance/generate-absent?date=2026-01-08` - Generate for specific date
- `POST /attendance/generate-absent-range?startDate=2026-01-01&endDate=2026-01-07` - Generate for date range

### 2. Automated Cron Jobs

Two automatic tasks run in the background:

#### Daily Job (11:59 PM)

Runs every night at 11:59 PM to generate absent records for today.

#### Weekly Job (Monday 1:00 AM)

Runs every Monday to fill any missed days from the past week (safety check).

### 3. SQL Migration Scripts

For filling historical data manually via database.

---

## 🚀 Quick Start

### Step 1: Cron Job is Already Active! ✅

The cron job starts automatically when you run your backend:

```bash
npm run start:dev
```

You'll see logs like:

```
🕐 Starting daily absent record generation...
✅ Generated 5 absent records for 1/8/2026
📊 Stats: 10 eligible, 5 present, 0 skipped
```

### Step 2: Test Manually (Optional)

Test the API before waiting for cron:

```bash
# Generate absent records for today
curl -X POST http://localhost:3000/attendance/generate-absent

# Generate for specific date
curl -X POST "http://localhost:3000/attendance/generate-absent?date=2026-01-08"

# Generate for date range (Jan 1-7)
curl -X POST "http://localhost:3000/attendance/generate-absent-range?startDate=2026-01-01&endDate=2026-01-07"
```

---

## 📊 How It Works

### Smart Logic

1. ✅ **Checks weekends**: Skips Friday & Saturday automatically
2. ✅ **Respects join dates**: Only checks employees who joined by that date
3. ✅ **Avoids duplicates**: Won't create absent records if attendance exists
4. ✅ **Employee-specific**: Hanif joined Jan 2? Only checked from Jan 2 onwards

### Example Scenario

**Hanif joins January 2, 2026:**

| Date  | Day | Hanif Status | Reason                                 |
| ----- | --- | ------------ | -------------------------------------- |
| Jan 1 | Wed | ❌ Skipped   | Not joined yet                         |
| Jan 2 | Thu | ✅ Eligible  | Joined today (absent if no attendance) |
| Jan 3 | Fri | ⏭️ Skipped   | Weekend (Friday)                       |
| Jan 4 | Sat | ⏭️ Skipped   | Weekend (Saturday)                     |
| Jan 5 | Sun | ✅ Eligible  | Working day (absent if no attendance)  |
| Jan 6 | Mon | ✅ Eligible  | Working day                            |

---

## 🗄️ SQL Migration for Historical Data

### Option 1: Quick Preview (Recommended First)

See what will be generated before inserting:

```sql
-- Copy contents of: prisma/migrations/quick-generate-absent.sql
-- Change dates at line 9 and 13
-- Run in your database to see preview
```

### Option 2: Full Migration

Generate absent records for entire month:

```sql
-- Copy contents of: prisma/migrations/generate-absent-records.sql
-- Change start date (line 15): DATE '2026-01-01'
-- Change end date (line 22): DATE '2026-01-31'
-- Run in your database
```

### Using Database GUI (pgAdmin/TablePlus):

1. Open your database tool
2. Open SQL query window
3. Copy/paste the SQL script
4. Modify dates as needed
5. Run the script
6. Check the summary output

---

## ⚙️ Configuration

### Change Timezone

Edit `src/attendance/attendance-cron.service.ts`:

```typescript
@Cron('59 23 * * *', {
  timeZone: 'Asia/Dhaka', // <-- Change this
})
```

Common timezones:

- `Asia/Dhaka` - Bangladesh
- `Asia/Karachi` - Pakistan
- `Asia/Kolkata` - India
- `America/New_York` - US East
- `Europe/London` - UK

### Change Cron Schedule

Current: Daily at 11:59 PM

```typescript
@Cron('59 23 * * *') // minute hour day month dayOfWeek
```

Examples:

```typescript
'0 0 * * *'; // Midnight (00:00)
'0 9 * * *'; // 9:00 AM
'30 17 * * *'; // 5:30 PM
'0 0 * * 1'; // Midnight every Monday
```

### Change Weekend Days

Edit `src/attendance/attendance.service.ts` line 351:

```typescript
// Current: Friday & Saturday
const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

// Change to Sunday & Saturday:
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
```

Day mapping:

- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

---

## 📱 Admin Dashboard Integration (Future)

You can add an admin button to manually trigger:

```typescript
// In your admin screen
const triggerAbsentGeneration = async () => {
  try {
    const response = await fetch(
      'http://localhost:3000/attendance/generate-absent',
      { method: 'POST' },
    );
    const result = await response.json();
    Alert.alert('Success', result.message);
  } catch (error) {
    Alert.alert('Error', 'Failed to generate absent records');
  }
};
```

---

## 🧪 Testing

### Test the Cron Service

```bash
# Start backend in dev mode
npm run start:dev

# Wait for logs at 11:59 PM, or test manually via API
curl -X POST http://localhost:3000/attendance/generate-absent
```

### Expected Logs

```
[AttendanceCronService] 🕐 Starting daily absent record generation...
[AttendanceCronService] ✅ Generated 5 absent records for 1/8/2026
[AttendanceCronService] 📊 Stats: 10 eligible, 5 present, 0 skipped
```

On weekends:

```
[AttendanceCronService] ⏭️  Skipped: Skipped: 1/10/2026 is a weekend (Friday/Saturday)
```

---

## 🔍 Troubleshooting

### Cron not running?

Check if ScheduleModule is imported in `app.module.ts`:

```typescript
imports: [
  ScheduleModule.forRoot(), // Should be here
  ...
]
```

### Wrong timezone?

Update timezone in `attendance-cron.service.ts`:

```typescript
timeZone: 'Asia/Dhaka';
```

### Too many absent records?

Check if weekend filter matches your company schedule:

```typescript
// Line 351 in attendance.service.ts
const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday
```

### Employee marked absent before join date?

This shouldn't happen - check employee `createdAt` date in database.

---

## 📊 Reports & Statistics

### Check Absence Statistics

```bash
GET /attendance/stats?startDate=2026-01-01&endDate=2026-01-31
```

Response:

```json
{
  "total": 200,
  "present": 150,
  "absent": 45,
  "late": 5,
  "presentPercentage": "75.00",
  "absentPercentage": "22.50"
}
```

---

## 🎯 Benefits

✅ **Complete tracking** - No missing attendance days  
✅ **Fair calculation** - Respects employee join dates  
✅ **Smart weekends** - Auto-skips Friday & Saturday  
✅ **Admin override** - Can manually mark present anytime  
✅ **Accurate reports** - Leave balance calculations are correct  
✅ **Automated** - No manual work needed

---

## 📝 Next Steps (Optional)

### 1. Add Holidays Table

Create a holidays table to skip public holidays:

```prisma
model Holiday {
  id        String   @id @default(uuid())
  name      String
  date      DateTime
  createdAt DateTime @default(now())
}
```

Then uncomment lines 362-378 in `attendance.service.ts`.

### 2. Add Leave Integration

Check if employee has approved leave → mark as "on_leave" instead of "absent".

### 3. Add Email Notifications

Send email to absent employees or HR manager.

---

## ✅ Checklist

- [x] Cron jobs installed (`@nestjs/schedule`)
- [x] Cron service created
- [x] Weekend logic (Friday/Saturday)
- [x] Employee join date check
- [x] API endpoints working
- [x] SQL migration scripts ready
- [ ] Test with real data
- [ ] Set correct timezone
- [ ] Run historical data migration
- [ ] Monitor logs for a week

---

## 🆘 Support

If you need help:

1. Check backend logs for errors
2. Test API endpoints manually
3. Verify database records
4. Check cron job logs at scheduled time

Happy automating! 🎉
