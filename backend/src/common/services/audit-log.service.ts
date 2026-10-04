import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  async logAction(entry: Omit<AuditLogEntry, 'timestamp'>) {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    try {
      // Log to application logs for audit trail
      const logMessage = `[AUDIT] ${logEntry.action} on ${logEntry.resource}${logEntry.resourceId ? ` (${logEntry.resourceId})` : ''} by user ${logEntry.userId || 'anonymous'} from ${logEntry.ipAddress} - ${logEntry.success ? 'SUCCESS' : 'FAILED'}`;
      
      if (logEntry.success) {
        this.logger.log(logMessage);
      } else {
        this.logger.error(`${logMessage} - ${logEntry.errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create audit log: ${errorMessage}`);
    }
  }

  // Convenience methods for common actions
  async logAuthentication(userId: string, success: boolean, ipAddress: string, userAgent: string, errorMessage?: string) {
    await this.logAction({
      userId,
      action: 'AUTHENTICATION',
      resource: 'auth',
      ipAddress,
      userAgent,
      success,
      errorMessage,
    });
  }

  async logDataAccess(userId: string, resource: string, resourceId: string, action: string, ipAddress: string) {
    await this.logAction({
      userId,
      action: `DATA_${action.toUpperCase()}`,
      resource,
      resourceId,
      ipAddress,
      success: true,
    });
  }

  async logSecurityEvent(action: string, details: any, ipAddress: string, userAgent: string) {
    await this.logAction({
      action: `SECURITY_${action.toUpperCase()}`,
      resource: 'security',
      details,
      ipAddress,
      userAgent,
      success: false, // Security events are typically failures/suspicious activities
    });
  }
}