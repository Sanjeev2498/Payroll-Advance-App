/*
  Warnings:

  - You are about to drop the column `hourly_rate_iv` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `hourly_rate_tag` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `billing_preferences` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `contract_end` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `contract_start` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `contract_status` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `aadhaar_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `aadhaar_number` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `aadhaar_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `account_number` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `account_number_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `account_number_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `account_type` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `basic_salary` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `basic_salary_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `basic_salary_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `email_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `email_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `epf_applicable` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `esic_applicable` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `esic_number` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `esic_number_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `esic_number_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `gross_salary` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `gross_salary_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `gross_salary_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `hra_amount` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `hra_amount_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `hra_amount_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `ifsc_code` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `ifsc_code_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `ifsc_code_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `other_allowances` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `other_allowances_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `other_allowances_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `pan_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `pan_number` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `pan_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `phone_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `phone_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `pt_applicable` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `salary_type` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `tds_applicable` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `uan_number` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `uan_number_iv` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `uan_number_tag` on the `employees` table. All the data in the column will be lost.
  - You are about to alter the column `email` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(255)`.
  - You are about to alter the column `phone` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(20)`.
  - You are about to drop the column `additional_charges` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `client_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `deployment_summary` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `gst_details` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `payment_reference` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `amount_iv` on the `payroll_items` table. All the data in the column will be lost.
  - You are about to drop the column `amount_tag` on the `payroll_items` table. All the data in the column will be lost.
  - You are about to drop the column `break_schedule` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `coverage_assigned` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `coverage_required` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `is_recurring` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `modification_log` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `recurring_pattern` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `shift_requirements` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `skill_requirements` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `template_id` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `client_id` on the `sites` table. All the data in the column will be lost.
  - You are about to drop the `shift_notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_templates` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `hourly_rate` on the `assignments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `contract_id` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `amount` on the `payroll_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `assignment_id` on table `shifts` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `contract_id` to the `sites` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ClientUserRole" AS ENUM ('SECURITY_MANAGER', 'FACILITY_MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'REGIONAL_MANAGER');

-- CreateEnum
CREATE TYPE "ClientOrganizationType" AS ENUM ('CORPORATE_OFFICE', 'RESIDENTIAL_SOCIETY', 'HOSPITAL', 'SHOPPING_MALL', 'FACTORY', 'WAREHOUSE', 'EDUCATIONAL_INSTITUTION', 'GOVERNMENT_BUILDING', 'HOTEL');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY');

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_client_id_fkey";

-- DropForeignKey
ALTER TABLE "shift_notifications" DROP CONSTRAINT "shift_notifications_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "shift_notifications" DROP CONSTRAINT "shift_notifications_shift_id_fkey";

-- DropForeignKey
ALTER TABLE "shift_notifications" DROP CONSTRAINT "shift_notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "shift_templates" DROP CONSTRAINT "shift_templates_company_id_fkey";

-- DropForeignKey
ALTER TABLE "shift_templates" DROP CONSTRAINT "shift_templates_site_id_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_template_id_fkey";

-- DropForeignKey
ALTER TABLE "sites" DROP CONSTRAINT "sites_client_id_fkey";

-- DropIndex
DROP INDEX "clients_company_id_contract_status_idx";

-- DropIndex
DROP INDEX "invoices_client_id_idx";

-- DropIndex
DROP INDEX "shifts_is_recurring_idx";

-- DropIndex
DROP INDEX "shifts_priority_idx";

-- DropIndex
DROP INDEX "shifts_template_id_idx";

-- DropIndex
DROP INDEX "sites_client_id_idx";

-- AlterTable
ALTER TABLE "assignments" DROP COLUMN "hourly_rate_iv",
DROP COLUMN "hourly_rate_tag",
DROP COLUMN "hourly_rate",
ADD COLUMN     "hourly_rate" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "start_date" SET DATA TYPE DATE,
ALTER COLUMN "end_date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "billing_preferences",
DROP COLUMN "contract_end",
DROP COLUMN "contract_start",
DROP COLUMN "contract_status",
ADD COLUMN     "company_size" VARCHAR(50),
ADD COLUMN     "industry" VARCHAR(100),
ADD COLUMN     "organization_type" "ClientOrganizationType" NOT NULL DEFAULT 'CORPORATE_OFFICE';

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "aadhaar_iv",
DROP COLUMN "aadhaar_number",
DROP COLUMN "aadhaar_tag",
DROP COLUMN "account_number",
DROP COLUMN "account_number_iv",
DROP COLUMN "account_number_tag",
DROP COLUMN "account_type",
DROP COLUMN "bank_name",
DROP COLUMN "bank_name_iv",
DROP COLUMN "bank_name_tag",
DROP COLUMN "basic_salary",
DROP COLUMN "basic_salary_iv",
DROP COLUMN "basic_salary_tag",
DROP COLUMN "date_of_birth",
DROP COLUMN "email_iv",
DROP COLUMN "email_tag",
DROP COLUMN "epf_applicable",
DROP COLUMN "esic_applicable",
DROP COLUMN "esic_number",
DROP COLUMN "esic_number_iv",
DROP COLUMN "esic_number_tag",
DROP COLUMN "gross_salary",
DROP COLUMN "gross_salary_iv",
DROP COLUMN "gross_salary_tag",
DROP COLUMN "hra_amount",
DROP COLUMN "hra_amount_iv",
DROP COLUMN "hra_amount_tag",
DROP COLUMN "ifsc_code",
DROP COLUMN "ifsc_code_iv",
DROP COLUMN "ifsc_code_tag",
DROP COLUMN "metadata",
DROP COLUMN "other_allowances",
DROP COLUMN "other_allowances_iv",
DROP COLUMN "other_allowances_tag",
DROP COLUMN "pan_iv",
DROP COLUMN "pan_number",
DROP COLUMN "pan_tag",
DROP COLUMN "phone_iv",
DROP COLUMN "phone_tag",
DROP COLUMN "pt_applicable",
DROP COLUMN "salary_type",
DROP COLUMN "tds_applicable",
DROP COLUMN "uan_number",
DROP COLUMN "uan_number_iv",
DROP COLUMN "uan_number_tag",
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "hire_date" SET DATA TYPE DATE,
ALTER COLUMN "termination_date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "additional_charges",
DROP COLUMN "client_id",
DROP COLUMN "deployment_summary",
DROP COLUMN "gst_details",
DROP COLUMN "notes",
DROP COLUMN "payment_reference",
ADD COLUMN     "contract_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "payroll_items" DROP COLUMN "amount_iv",
DROP COLUMN "amount_tag",
DROP COLUMN "amount",
ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "shifts" DROP COLUMN "break_schedule",
DROP COLUMN "coverage_assigned",
DROP COLUMN "coverage_required",
DROP COLUMN "is_recurring",
DROP COLUMN "modification_log",
DROP COLUMN "priority",
DROP COLUMN "recurring_pattern",
DROP COLUMN "shift_requirements",
DROP COLUMN "skill_requirements",
DROP COLUMN "template_id",
ALTER COLUMN "assignment_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sites" DROP COLUMN "client_id",
ADD COLUMN     "contract_id" UUID NOT NULL;

-- DropTable
DROP TABLE "shift_notifications";

-- DropTable
DROP TABLE "shift_templates";

-- DropEnum
DROP TYPE "AccountType";

-- DropEnum
DROP TYPE "NotificationStatus";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "RecurrenceType";

-- DropEnum
DROP TYPE "SalaryType";

-- DropEnum
DROP TYPE "ShiftPriority";

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "contract_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "service_definitions" JSONB,
    "service_level_agreement" JSONB,
    "billing_preferences" JSONB,
    "default_billing_rates" JSONB,
    "contract_value" DECIMAL(15,2),
    "payment_terms" JSONB,
    "renewal_notification_days" INTEGER DEFAULT 90,
    "auto_renewal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_client_id_idx" ON "contracts"("client_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_start_date_idx" ON "contracts"("start_date");

-- CreateIndex
CREATE INDEX "contracts_end_date_idx" ON "contracts"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_client_id_contract_number_key" ON "contracts"("client_id", "contract_number");

-- CreateIndex
CREATE INDEX "clients_organization_type_idx" ON "clients"("organization_type");

-- CreateIndex
CREATE INDEX "invoices_contract_id_idx" ON "invoices"("contract_id");

-- CreateIndex
CREATE INDEX "sites_contract_id_idx" ON "sites"("contract_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
