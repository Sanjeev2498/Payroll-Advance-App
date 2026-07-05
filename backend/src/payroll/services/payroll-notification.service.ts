import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { PayrollSummary } from '../dto';
import { getErrorMessage, getErrorStack, formatError } from '../../common/utils/error.util';


interface NotificationRecipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface PayrollNotificationContext {
  payrollRunId: string;
  runNumber: string;
  payPeriod: {
    start: Date;
    end: Date;
  };
  summary: PayrollSummary;
  recipients: NotificationRecipient[];
}

@Injectable()
export class PayrollNotificationService {
  private readonly logger = new Logger(PayrollNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Send payroll completion notifications to relevant stakeholders
   */
  async sendPayrollCompletionNotifications(
    payrollRunId: string,
    summary: PayrollSummary,
  ): Promise<void> {
    const companyId = this.tenantContext.getTenantId();
    
    this.logger.log(`Sending payroll completion notifications for run ${payrollRunId}`);

    try {
      // Get payroll run details
      const payrollRun = await this.prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: {
          runNumber: true,
          payPeriodStart: true,
          payPeriodEnd: true,
          totalAmount: true,
          processedAt: true,
        },
      });

      if (!payrollRun) {
        this.logger.warn(`Payroll run ${payrollRunId} not found for notifications`);
        return;
      }

      // Get notification recipients (managers, HR, finance)
      const recipients = await this.getNotificationRecipients(companyId);

      const notificationContext: PayrollNotificationContext = {
        payrollRunId,
        runNumber: payrollRun.runNumber,
        payPeriod: {
          start: payrollRun.payPeriodStart,
          end: payrollRun.payPeriodEnd,
        },
        summary,
        recipients,
      };

      // Send different types of notifications
      await Promise.all([
        this.sendManagerNotification(notificationContext),
        this.sendHRNotification(notificationContext),
        this.sendFinanceNotification(notificationContext),
      ]);

      this.logger.log(`Payroll notifications sent successfully for run ${payrollRunId}`);

    } catch (error) {
      this.logger.error(`Failed to send payroll notifications: ${(error as Error).message}`, (error as Error).stack);
      // Don't throw error - notifications are not critical for payroll processing
    }
  }

  /**
   * Send payroll error notifications when processing fails
   */
  async sendPayrollErrorNotifications(
    payrollRunId: string,
    errors: any[],
  ): Promise<void> {
    const companyId = this.tenantContext.getTenantId();
    
    this.logger.log(`Sending payroll error notifications for run ${payrollRunId}`);

    try {
      const payrollRun = await this.prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: {
          runNumber: true,
          payPeriodStart: true,
          payPeriodEnd: true,
        },
      });

      if (!payrollRun) {
        return;
      }

      const recipients = await this.getNotificationRecipients(companyId, ['MANAGER', 'COMPANY_ADMIN']);

      const errorNotificationData = {
        payrollRunId,
        runNumber: payrollRun.runNumber,
        payPeriod: {
          start: payrollRun.payPeriodStart,
          end: payrollRun.payPeriodEnd,
        },
        errors,
        recipients,
      };

      await this.sendErrorNotification(errorNotificationData);

      this.logger.log(`Payroll error notifications sent for run ${payrollRunId}`);

    } catch (error) {
      this.logger.error(`Failed to send payroll error notifications: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }

  /**
   * Send employee pay slip notifications
   */
  async sendEmployeePaySlipNotifications(
    payrollRunId: string,
    employeeResults: any[],
  ): Promise<void> {
    this.logger.log(`Sending pay slip notifications for ${employeeResults.length} employees`);

    try {
      const payrollRun = await this.prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: {
          runNumber: true,
          payPeriodStart: true,
          payPeriodEnd: true,
        },
      });

      if (!payrollRun) {
        return;
      }

      // Process employees in batches to avoid overwhelming the notification system
      const batchSize = 10;
      for (let i = 0; i < employeeResults.length; i += batchSize) {
        const batch = employeeResults.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(employeeResult => 
            this.sendEmployeePaySlip(payrollRun, employeeResult)
          )
        );

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.logger.log(`Pay slip notifications sent for ${employeeResults.length} employees`);

    } catch (error) {
      this.logger.error(`Failed to send pay slip notifications: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }

  // Private helper methods

  private async getNotificationRecipients(
    companyId: string,
    roles?: string[]
  ): Promise<NotificationRecipient[]> {
    const whereClause: any = {
      companyId,
      isActive: true,
    };

    if (roles && roles.length > 0) {
      whereClause.role = { in: roles };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return users;
  }

  private async sendManagerNotification(context: PayrollNotificationContext): Promise<void> {
    const managers = context.recipients.filter(r => 
      ['MANAGER', 'COMPANY_ADMIN'].includes(r.role)
    );

    for (const manager of managers) {
      await this.sendNotification({
        to: manager.email,
        subject: `Payroll Processing Complete - ${context.runNumber}`,
        template: 'payroll-manager-notification',
        data: {
          recipientName: `${manager.firstName} ${manager.lastName}`,
          runNumber: context.runNumber,
          payPeriod: context.payPeriod,
          employeeCount: context.summary.employeeCount,
          totalAmount: context.summary.totalNetAmount.toString(),
          payrollRunId: context.payrollRunId,
        },
      });
    }
  }

  private async sendHRNotification(context: PayrollNotificationContext): Promise<void> {
    // HR-specific notification logic would go here
    this.logger.log(`Sending HR notification for payroll run ${context.runNumber}`);
  }

  private async sendFinanceNotification(context: PayrollNotificationContext): Promise<void> {
    // Finance-specific notification logic would go here
    this.logger.log(`Sending finance notification for payroll run ${context.runNumber}`);
  }

  private async sendErrorNotification(errorData: any): Promise<void> {
    // Error notification logic would go here
    this.logger.log(`Sending error notification for payroll run ${errorData.runNumber}`);
  }

  private async sendEmployeePaySlip(payrollRun: any, employeeResult: any): Promise<void> {
    // Employee pay slip notification logic would go here
    this.logger.log(`Sending pay slip to employee ${employeeResult.employeeName}`);
  }

  private async sendNotification(notificationData: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    // In a production system, this would integrate with email service
    // For now, just log the notification
    this.logger.log(`Notification: ${notificationData.subject} -> ${notificationData.to}`);
  }
}
