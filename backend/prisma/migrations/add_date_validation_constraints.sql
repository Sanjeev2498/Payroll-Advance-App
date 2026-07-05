-- Bug 1 Fix: Add comprehensive date validation constraints
-- These constraints prevent invalid dates that PostgreSQL cannot handle

-- Add check constraints for date fields to prevent invalid dates
-- Prevent year 0000 and negative years (PostgreSQL date range issues)

-- Client contract dates
ALTER TABLE "clients" 
  ADD CONSTRAINT check_contract_start_valid_year 
    CHECK ("contract_start" IS NULL OR EXTRACT(YEAR FROM "contract_start") > 0),
  ADD CONSTRAINT check_contract_end_valid_year 
    CHECK ("contract_end" IS NULL OR EXTRACT(YEAR FROM "contract_end") > 0),
  ADD CONSTRAINT check_contract_dates_logical 
    CHECK ("contract_start" IS NULL OR "contract_end" IS NULL OR "contract_start" < "contract_end");

-- Employee dates
ALTER TABLE "employees"
  ADD CONSTRAINT check_hire_date_valid_year 
    CHECK (EXTRACT(YEAR FROM "hire_date") > 0),
  ADD CONSTRAINT check_termination_date_valid_year 
    CHECK ("termination_date" IS NULL OR EXTRACT(YEAR FROM "termination_date") > 0),
  ADD CONSTRAINT check_date_of_birth_valid_year 
    CHECK ("date_of_birth" IS NULL OR EXTRACT(YEAR FROM "date_of_birth") > 0),
  ADD CONSTRAINT check_employment_dates_logical 
    CHECK ("termination_date" IS NULL OR "hire_date" <= "termination_date");

-- Assignment dates  
ALTER TABLE "assignments"
  ADD CONSTRAINT check_assignment_start_date_valid_year 
    CHECK (EXTRACT(YEAR FROM "start_date") > 0),
  ADD CONSTRAINT check_assignment_end_date_valid_year 
    CHECK ("end_date" IS NULL OR EXTRACT(YEAR FROM "end_date") > 0),
  ADD CONSTRAINT check_assignment_dates_logical 
    CHECK ("end_date" IS NULL OR "start_date" <= "end_date");

-- PayrollRun date validation
ALTER TABLE "payroll_runs"
  ADD CONSTRAINT check_payroll_period_start_valid_year 
    CHECK (EXTRACT(YEAR FROM "pay_period_start") > 0),
  ADD CONSTRAINT check_payroll_period_end_valid_year 
    CHECK (EXTRACT(YEAR FROM "pay_period_end") > 0),
  ADD CONSTRAINT check_payroll_period_logical 
    CHECK ("pay_period_start" < "pay_period_end");

-- Invoice date validation
ALTER TABLE "invoices"
  ADD CONSTRAINT check_billing_period_start_valid_year 
    CHECK (EXTRACT(YEAR FROM "billing_period_start") > 0),
  ADD CONSTRAINT check_billing_period_end_valid_year 
    CHECK (EXTRACT(YEAR FROM "billing_period_end") > 0),
  ADD CONSTRAINT check_due_date_valid_year 
    CHECK (EXTRACT(YEAR FROM "due_date") > 0),
  ADD CONSTRAINT check_billing_period_logical 
    CHECK ("billing_period_start" < "billing_period_end");

-- Shift date validation
ALTER TABLE "shifts"
  ADD CONSTRAINT check_shift_date_valid_year 
    CHECK (EXTRACT(YEAR FROM "shift_date") > 0);

-- Attendance timestamp validation
ALTER TABLE "attendance"
  ADD CONSTRAINT check_clock_in_valid_year 
    CHECK ("clock_in" IS NULL OR EXTRACT(YEAR FROM "clock_in") > 0),
  ADD CONSTRAINT check_clock_out_valid_year 
    CHECK ("clock_out" IS NULL OR EXTRACT(YEAR FROM "clock_out") > 0);

-- User login timestamp validation
ALTER TABLE "users"
  ADD CONSTRAINT check_last_login_valid_year 
    CHECK ("last_login_at" IS NULL OR EXTRACT(YEAR FROM "last_login_at") > 0);

-- Notification timestamp validation
ALTER TABLE "shift_notifications"
  ADD CONSTRAINT check_scheduled_for_valid_year 
    CHECK ("scheduled_for" IS NULL OR EXTRACT(YEAR FROM "scheduled_for") > 0),
  ADD CONSTRAINT check_sent_at_valid_year 
    CHECK ("sent_at" IS NULL OR EXTRACT(YEAR FROM "sent_at") > 0),
  ADD CONSTRAINT check_read_at_valid_year 
    CHECK ("read_at" IS NULL OR EXTRACT(YEAR FROM "read_at") > 0);

-- Add reasonable upper bounds to prevent unrealistic future dates
-- Business rule: No dates beyond year 2100 (prevents accidental typos like 20244)
ALTER TABLE "clients" 
  ADD CONSTRAINT check_contract_dates_reasonable_future 
    CHECK ("contract_start" IS NULL OR EXTRACT(YEAR FROM "contract_start") <= 2100)
    , ADD CONSTRAINT check_contract_end_reasonable_future 
    CHECK ("contract_end" IS NULL OR EXTRACT(YEAR FROM "contract_end") <= 2100);

ALTER TABLE "employees"
  ADD CONSTRAINT check_hire_date_reasonable_future 
    CHECK (EXTRACT(YEAR FROM "hire_date") <= 2100),
  ADD CONSTRAINT check_termination_date_reasonable_future 
    CHECK ("termination_date" IS NULL OR EXTRACT(YEAR FROM "termination_date") <= 2100);

-- Add reasonable past bounds for employment dates
-- Business rule: No employment before 1950 (reasonable for a modern business)
ALTER TABLE "employees"
  ADD CONSTRAINT check_hire_date_reasonable_past 
    CHECK (EXTRACT(YEAR FROM "hire_date") >= 1950),
  ADD CONSTRAINT check_date_of_birth_reasonable_past 
    CHECK ("date_of_birth" IS NULL OR EXTRACT(YEAR FROM "date_of_birth") >= 1900);

COMMIT;