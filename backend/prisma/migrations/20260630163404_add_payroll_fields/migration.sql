-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SAVINGS', 'CURRENT');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "account_number" VARCHAR(500),
ADD COLUMN     "account_number_iv" VARCHAR(32),
ADD COLUMN     "account_number_tag" VARCHAR(32),
ADD COLUMN     "account_type" "AccountType" NOT NULL DEFAULT 'SAVINGS',
ADD COLUMN     "bank_name" VARCHAR(500),
ADD COLUMN     "bank_name_iv" VARCHAR(32),
ADD COLUMN     "bank_name_tag" VARCHAR(32),
ADD COLUMN     "basic_salary" VARCHAR(500),
ADD COLUMN     "basic_salary_iv" VARCHAR(32),
ADD COLUMN     "basic_salary_tag" VARCHAR(32),
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "epf_applicable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "esic_applicable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "esic_number" VARCHAR(500),
ADD COLUMN     "esic_number_iv" VARCHAR(32),
ADD COLUMN     "esic_number_tag" VARCHAR(32),
ADD COLUMN     "gross_salary" VARCHAR(500),
ADD COLUMN     "gross_salary_iv" VARCHAR(32),
ADD COLUMN     "gross_salary_tag" VARCHAR(32),
ADD COLUMN     "hra_amount" VARCHAR(500),
ADD COLUMN     "hra_amount_iv" VARCHAR(32),
ADD COLUMN     "hra_amount_tag" VARCHAR(32),
ADD COLUMN     "ifsc_code" VARCHAR(500),
ADD COLUMN     "ifsc_code_iv" VARCHAR(32),
ADD COLUMN     "ifsc_code_tag" VARCHAR(32),
ADD COLUMN     "other_allowances" VARCHAR(500),
ADD COLUMN     "other_allowances_iv" VARCHAR(32),
ADD COLUMN     "other_allowances_tag" VARCHAR(32),
ADD COLUMN     "pt_applicable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "salary_type" "SalaryType" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "tds_applicable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "uan_number" VARCHAR(500),
ADD COLUMN     "uan_number_iv" VARCHAR(32),
ADD COLUMN     "uan_number_tag" VARCHAR(32);
