-- =============================================
-- Auto-Generate Absent Records for Missing Dates
-- This script fills in absent records for employees
-- who didn't clock in on working days
-- =============================================

-- Step 1: Create a temporary function to generate dates
-- (This works in PostgreSQL, adjust for other databases)

-- Step 2: Generate absent records for all working days in date range
-- Replace @start_date and @end_date with your desired range
-- Example: Generate for January 2026
WITH RECURSIVE date_range AS (
  -- Start date: January 1, 2026
  SELECT DATE '2026-01-01' AS date
  
  UNION ALL
  
  -- Generate dates up to end date
  SELECT date + INTERVAL '1 day'
  FROM date_range
  WHERE date < DATE '2026-01-31' -- End date: January 31, 2026
),

working_days AS (
  -- Filter out weekends (Friday=5, Saturday=6)
  SELECT date
  FROM date_range
  WHERE EXTRACT(DOW FROM date) NOT IN (5, 6) -- DOW: 0=Sunday, 5=Friday, 6=Saturday
),

eligible_employees AS (
  -- Get employees who should have attendance for each date
  SELECT 
    wd.date,
    u.id as user_id,
    u.name,
    u."employeeId"
  FROM working_days wd
  CROSS JOIN "User" u
  WHERE 
    u.role = 'employee' 
    AND u.status = 'active'
    AND DATE(u."createdAt") <= wd.date -- Only employees who joined by this date
),

existing_attendance AS (
  -- Find existing attendance records
  SELECT 
    DATE(date) as attendance_date,
    "userId"
  FROM "Attendance"
  WHERE DATE(date) BETWEEN DATE '2026-01-01' AND DATE '2026-01-31'
),

missing_attendance AS (
  -- Find employees without attendance on working days
  SELECT 
    ee.date,
    ee.user_id,
    ee.name,
    ee."employeeId"
  FROM eligible_employees ee
  LEFT JOIN existing_attendance ea 
    ON DATE(ee.date) = ea.attendance_date 
    AND ee.user_id = ea."userId"
  WHERE ea."userId" IS NULL -- No attendance record exists
)

-- Insert absent records for missing attendance
INSERT INTO "Attendance" (
  id,
  "userId",
  date,
  status,
  "checkIn",
  "checkOut",
  notes,
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid() as id, -- Generate UUID (PostgreSQL function)
  user_id,
  date,
  'absent' as status,
  NULL as "checkIn",
  NULL as "checkOut",
  'Auto-generated: Historical data migration' as notes,
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM missing_attendance;

-- Step 3: Show summary of inserted records
SELECT 
  DATE(date) as date,
  CASE EXTRACT(DOW FROM date)
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_of_week,
  COUNT(*) as absent_records_created
FROM missing_attendance
GROUP BY date
ORDER BY date;

-- =============================================
-- USAGE INSTRUCTIONS:
-- =============================================
-- 1. Replace DATE '2026-01-01' with your start date
-- 2. Replace DATE '2026-01-31' with your end date
-- 3. Adjust weekend days if needed:
--    - Current: Friday(5) & Saturday(6)
--    - Standard: Sunday(0) & Saturday(6)
-- 4. Run this script in your database
-- 5. Check the summary output
-- =============================================

-- =============================================
-- NOTES:
-- =============================================
-- - This script is SAFE to run multiple times
--   (Won't create duplicates due to LEFT JOIN check)
-- - Only creates records for active employees
-- - Respects employee join dates
-- - Skips weekends (Friday/Saturday)
-- - Can be adjusted for holidays by adding
--   a holiday table filter
-- =============================================
