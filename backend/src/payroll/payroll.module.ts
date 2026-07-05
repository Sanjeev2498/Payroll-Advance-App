import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollPolicyService } from './services/payroll-policy.service';
import { PayrollRunManagementService } from './services/payroll-run-management.service';
import { PayrollValidationService } from './services/payroll-validation.service';
import { PayrollNotificationService } from './services/payroll-notification.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonModule, PrismaModule, AuthModule],
  controllers: [PayrollController],
  providers: [
    PayrollService, 
    PayrollCalculationService, 
    PayrollPolicyService,
    PayrollRunManagementService,
    PayrollValidationService,
    PayrollNotificationService
  ],
  exports: [
    PayrollService, 
    PayrollCalculationService, 
    PayrollPolicyService,
    PayrollRunManagementService,
    PayrollValidationService,
    PayrollNotificationService
  ],
})
export class PayrollModule {}
