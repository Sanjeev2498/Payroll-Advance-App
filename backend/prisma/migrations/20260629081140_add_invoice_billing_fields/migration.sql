/*
  Warnings:

  - A unique constraint covering the columns `[aadhaar_number]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pan_number]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ShiftPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SHIFT_ASSIGNED', 'SHIFT_CHANGED', 'SHIFT_CANCELLED', 'COVERAGE_REQUEST', 'SHIFT_REMINDER', 'OVERTIME_ALERT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'ACKNOWLEDGED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShiftStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ShiftStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "ShiftStatus" ADD VALUE 'NEEDS_COVERAGE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShiftType" ADD VALUE 'TRAINING';
ALTER TYPE "ShiftType" ADD VALUE 'MAINTENANCE';

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_assignment_id_fkey";

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "aadhaar_number" VARCHAR(12),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "pan_number" VARCHAR(10);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "additional_charges" JSONB,
ADD COLUMN     "deployment_summary" JSONB,
ADD COLUMN     "gst_details" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payment_reference" VARCHAR(255);

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "break_schedule" JSONB,
ADD COLUMN     "coverage_assigned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "coverage_required" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modification_log" JSONB,
ADD COLUMN     "priority" "ShiftPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "recurring_pattern" JSONB,
ADD COLUMN     "shift_requirements" JSONB,
ADD COLUMN     "skill_requirements" JSONB,
ADD COLUMN     "template_id" UUID,
ALTER COLUMN "assignment_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "site_id" UUID,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "shift_type" "ShiftType" NOT NULL DEFAULT 'REGULAR',
    "coverage_required" INTEGER NOT NULL DEFAULT 1,
    "skill_requirements" JSONB,
    "shift_requirements" JSONB,
    "break_schedule" JSONB,
    "recurrence_pattern" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_notifications" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "user_id" UUID,
    "employee_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_for" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shift_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_templates_company_id_idx" ON "shift_templates"("company_id");

-- CreateIndex
CREATE INDEX "shift_templates_site_id_idx" ON "shift_templates"("site_id");

-- CreateIndex
CREATE INDEX "shift_templates_is_active_idx" ON "shift_templates"("is_active");

-- CreateIndex
CREATE INDEX "shift_notifications_shift_id_idx" ON "shift_notifications"("shift_id");

-- CreateIndex
CREATE INDEX "shift_notifications_user_id_idx" ON "shift_notifications"("user_id");

-- CreateIndex
CREATE INDEX "shift_notifications_employee_id_idx" ON "shift_notifications"("employee_id");

-- CreateIndex
CREATE INDEX "shift_notifications_type_idx" ON "shift_notifications"("type");

-- CreateIndex
CREATE INDEX "shift_notifications_status_idx" ON "shift_notifications"("status");

-- CreateIndex
CREATE INDEX "shift_notifications_scheduled_for_idx" ON "shift_notifications"("scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "employees_aadhaar_number_key" ON "employees"("aadhaar_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_pan_number_key" ON "employees"("pan_number");

-- CreateIndex
CREATE INDEX "shifts_template_id_idx" ON "shifts"("template_id");

-- CreateIndex
CREATE INDEX "shifts_is_recurring_idx" ON "shifts"("is_recurring");

-- CreateIndex
CREATE INDEX "shifts_priority_idx" ON "shifts"("priority");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_notifications" ADD CONSTRAINT "shift_notifications_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_notifications" ADD CONSTRAINT "shift_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_notifications" ADD CONSTRAINT "shift_notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
