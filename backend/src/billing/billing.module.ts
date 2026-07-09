import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { FinancialReportsController } from './financial-reports.controller';
import { InvoiceService } from './services/invoice.service';
import { InvoiceCalculationService } from './services/invoice-calculation.service';
import { GstCalculationService } from './services/gst-calculation.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { BillingValidationService } from './services/billing-validation.service';
import { FinancialReportsService } from './services/financial-reports.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PayrollModule } from '../payroll/payroll.module';

@Module({
  imports: [CommonModule, PrismaModule, AuthModule, PayrollModule],
  controllers: [BillingController, FinancialReportsController],
  providers: [
    BillingService,
    InvoiceService,
    InvoiceCalculationService,
    GstCalculationService,
    InvoicePdfService,
    BillingValidationService,
    FinancialReportsService,
  ],
  exports: [
    BillingService,
    InvoiceService,
    InvoiceCalculationService,
    GstCalculationService,
    InvoicePdfService,
    BillingValidationService,
    FinancialReportsService,
  ],
})
export class BillingModule {}
