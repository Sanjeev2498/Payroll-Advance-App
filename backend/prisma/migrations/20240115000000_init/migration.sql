-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'PENDING', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('REGULAR', 'OVERTIME', 'HOLIDAY', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'LATE', 'EARLY_DEPARTURE', 'OVERTIME');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollItemType" AS ENUM ('BASIC_PAY', 'OVERTIME', 'BONUS', 'ALLOWANCE', 'TAX_DEDUCTION', 'SOCIAL_SECURITY', 'HEALTH_INSURANCE', 'OTHER_DEDUCTION');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "settings" JSONB,
    "branding" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_info" JSONB,
    "contract_status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "contract_start" DATE,
    "contract_end" DATE,
    "billing_preferences" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" JSONB NOT NULL,
    "access_requirements" JSONB,
    "safety_protocols" JSONB,
    "operational_status" "OperationalStatus" NOT NULL DEFAULT 'ACTIVE',
    "contact_info" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_number" VARCHAR(20) NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" JSONB,
    "certifications" JSONB,
    "skills" VARCHAR(50)[],
    "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hire_date" DATE NOT NULL,
    "termination_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "responsibilities" JSONB,
    "hourly_rate" DECIMAL(10,2) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "shift_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "shift_type" "ShiftType" NOT NULL DEFAULT 'REGULAR',
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "clock_in" TIMESTAMPTZ,
    "clock_out" TIMESTAMPTZ,
    "location_data" JSONB,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "verification_data" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "run_number" VARCHAR(50) NOT NULL,
    "pay_period_start" DATE NOT NULL,
    "pay_period_end" DATE NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "item_type" "PayrollItemType" NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "calculation_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "clients_company_id_idx" ON "clients"("company_id");

-- CreateIndex
CREATE INDEX "clients_company_id_contract_status_idx" ON "clients"("company_id", "contract_status");

-- CreateIndex
CREATE INDEX "sites_client_id_idx" ON "sites"("client_id");

-- CreateIndex
CREATE INDEX "sites_operational_status_idx" ON "sites"("operational_status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_company_id_employee_number_key" ON "employees"("company_id", "employee_number");

-- CreateIndex
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");

-- CreateIndex
CREATE INDEX "employees_company_id_employment_status_idx" ON "employees"("company_id", "employment_status");

-- CreateIndex
CREATE INDEX "employees_skills_idx" ON "employees"("skills");

-- CreateIndex
CREATE INDEX "assignments_employee_id_idx" ON "assignments"("employee_id");

-- CreateIndex
CREATE INDEX "assignments_site_id_idx" ON "assignments"("site_id");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE INDEX "shifts_assignment_id_idx" ON "shifts"("assignment_id");

-- CreateIndex
CREATE INDEX "shifts_site_id_idx" ON "shifts"("site_id");

-- CreateIndex
CREATE INDEX "shifts_shift_date_idx" ON "shifts"("shift_date");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "attendance_employee_id_idx" ON "attendance"("employee_id");

-- CreateIndex
CREATE INDEX "attendance_shift_id_idx" ON "attendance"("shift_id");

-- CreateIndex
CREATE INDEX "attendance_clock_in_idx" ON "attendance"("clock_in");

-- CreateIndex
CREATE INDEX "attendance_status_idx" ON "attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_company_id_run_number_key" ON "payroll_runs"("company_id", "run_number");

-- CreateIndex
CREATE INDEX "payroll_runs_company_id_idx" ON "payroll_runs"("company_id");

-- CreateIndex
CREATE INDEX "payroll_runs_status_idx" ON "payroll_runs"("status");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_run_id_idx" ON "payroll_items"("payroll_run_id");

-- CreateIndex
CREATE INDEX "payroll_items_employee_id_idx" ON "payroll_items"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_items_item_type_idx" ON "payroll_items"("item_type");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;