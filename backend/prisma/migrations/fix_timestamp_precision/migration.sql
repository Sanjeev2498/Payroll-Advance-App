-- Bug 3 Fix: Convert Date fields to Timestamptz for precision-critical fields
-- This migration fixes client data precision loss by using proper timestamp types

-- Fix Client contract dates (main Bug 3 issue)
ALTER TABLE "clients" 
  ALTER COLUMN "contract_start" TYPE TIMESTAMPTZ USING "contract_start"::TIMESTAMPTZ,
  ALTER COLUMN "contract_end" TYPE TIMESTAMPTZ USING "contract_end"::TIMESTAMPTZ;

-- Fix Employee employment dates (hire/termination times matter for payroll)
ALTER TABLE "employees"
  ALTER COLUMN "hire_date" TYPE TIMESTAMPTZ USING "hire_date"::TIMESTAMPTZ,
  ALTER COLUMN "termination_date" TYPE TIMESTAMPTZ USING "termination_date"::TIMESTAMPTZ;

-- Fix Assignment dates (start/end times matter for scheduling)
ALTER TABLE "assignments"
  ALTER COLUMN "start_date" TYPE TIMESTAMPTZ USING "start_date"::TIMESTAMPTZ,
  ALTER COLUMN "end_date" TYPE TIMESTAMPTZ USING "end_date"::TIMESTAMPTZ;

-- Note: Keep date_of_birth as DATE (birth dates don't need time precision)
-- Note: Keep payroll periods, billing periods, due dates as DATE (day-based business logic)
-- Note: Keep shift_date as DATE (represents the day, not specific time)