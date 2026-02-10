-- =============================================
-- QUICK VERSION: Generate Absent Records
-- Use this for quick testing or one-time data fill
-- =============================================

-- STEP 1: Check how many records will be created (DRY RUN)
-- Run this first to see what will happen
WITH RECURSIVE date_range AS (
  SELECT DATE '2026-01-01' AS date
  UNION ALL
  SELECT date + INTERVAL '1 day'
  FROM date_range
  WHERE date < DATE '2026-01-08' -- Change end date here
),
working_days AS (
  SELECT date
  FROM date_range
  WHERE EXTRACT(DOW FROM date) NOT IN (5, 6) -- Friday & Saturday
),
eligible_employees AS (
  SELECT 
    wd.date,
    u.id as user_id,
    u.name
  FROM working_days wd
  CROSS JOIN "User" u
  WHERE 
    u.role = 'employee' 
    AND u.status = 'active'
    AND DATE(u."createdAt") <= wd.date
),
existing_attendance AS (
  SELECT 
    DATE(date) as attendance_date,
    "userId"
  FROM "Attendance"
),
missing_attendance AS (
  SELECT 
    ee.date,
    ee.user_id,
    ee.name
  FROM eligible_employees ee
  LEFT JOIN existing_attendance ea 
    ON DATE(ee.date) = ea.attendance_date 
    AND ee.user_id = ea."userId"
  WHERE ea."userId" IS NULL
)
SELECT 
  date,
  COUNT(*) as employees_missing_attendance,
  STRING_AGG(name, ', ') as employee_names
FROM missing_attendance
GROUP BY date
ORDER BY date;

-- =============================================
-- STEP 2: If happy with preview, run the INSERT
-- Comment out STEP 1 above and run this:
-- =============================================

-- WITH RECURSIVE date_range AS (
--   SELECT DATE '2026-01-01' AS date
--   UNION ALL
--   SELECT date + INTERVAL '1 day'
--   FROM date_range
--   WHERE date < DATE '2026-01-08'
-- ),
-- working_days AS (
--   SELECT date
--   FROM date_range
--   WHERE EXTRACT(DOW FROM date) NOT IN (5, 6)
-- ),
-- eligible_employees AS (
--   SELECT 
--     wd.date,
--     u.id as user_id
--   FROM working_days wd
--   CROSS JOIN "User" u
--   WHERE 
--     u.role = 'employee' 
--     AND u.status = 'active'
--     AND DATE(u."createdAt") <= wd.date
-- ),
-- existing_attendance AS (
--   SELECT 
--     DATE(date) as attendance_date,
--     "userId"
--   FROM "Attendance"
-- ),
-- missing_attendance AS (
--   SELECT 
--     ee.date,
--     ee.user_id
--   FROM eligible_employees ee
--   LEFT JOIN existing_attendance ea 
--     ON DATE(ee.date) = ea.attendance_date 
--     AND ee.user_id = ea."userId"
--   WHERE ea."userId" IS NULL
-- )
-- INSERT INTO "Attendance" (
--   id,
--   "userId",
--   date,
--   status,
--   "checkIn",
--   "checkOut",
--   notes,
--   "createdAt",
--   "updatedAt"
-- )
-- SELECT 
--   gen_random_uuid(),
--   user_id,
--   date,
--   'absent',
--   NULL,
--   NULL,
--   'Auto-generated: Historical data migration',
--   NOW(),
--   NOW()
-- FROM missing_attendance
-- RETURNING 
--   DATE(date) as date, 
--   COUNT(*) as records_created;
