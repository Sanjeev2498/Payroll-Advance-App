/*
  Warnings:

  - Added the required column `hourly_rate_iv` to the `assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hourly_rate_tag` to the `assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount_iv` to the `payroll_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount_tag` to the `payroll_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "employees_aadhaar_number_key";

-- DropIndex
DROP INDEX "employees_pan_number_key";

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "hourly_rate_iv" VARCHAR(32) NOT NULL,
ADD COLUMN     "hourly_rate_tag" VARCHAR(32) NOT NULL,
ALTER COLUMN "hourly_rate" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "aadhaar_iv" VARCHAR(32),
ADD COLUMN     "aadhaar_tag" VARCHAR(32),
ADD COLUMN     "email_iv" VARCHAR(32),
ADD COLUMN     "email_tag" VARCHAR(32),
ADD COLUMN     "pan_iv" VARCHAR(32),
ADD COLUMN     "pan_tag" VARCHAR(32),
ADD COLUMN     "phone_iv" VARCHAR(32),
ADD COLUMN     "phone_tag" VARCHAR(32),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "aadhaar_number" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "pan_number" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "amount_iv" VARCHAR(32) NOT NULL,
ADD COLUMN     "amount_tag" VARCHAR(32) NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE VARCHAR(500);
