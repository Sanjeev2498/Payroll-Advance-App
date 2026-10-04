import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    try {
      // Check for suspicious patterns
      await this.checkSuspiciousPatterns(request);
      
      // Check request frequency (basic protection)
      await this.checkRequestFrequency(request);
      
      // Log security event
      await this.auditLogService.logAction({
        userId: request.user?.id,
        action: 'SECURITY_CHECK',
        resource: 'guard',
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        success: true,
      });
      
      return true;
    } catch (error) {
      // Log security violation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogService.logSecurityEvent(
        'SECURITY_VIOLATION',
        { error: errorMessage, url: request.url },
        this.getClientIp(request),
        request.headers['user-agent'],
      );
      
      throw error;
    }
  }

  private async checkSuspiciousPatterns(request: any): Promise<void> {
    const suspiciousPatterns = [
      // SQL Injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(;|--|\|\||&&)/,
      /(\bOR\s+1=1\b|\bAND\s+1=1\b)/i,
      
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on(load|error|click|focus|blur)=/gi,
      /<iframe/gi,
      
      // Path traversal
      /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\|%252e%252e%252f/gi,
      
      // Command injection
      /;|\||&&|\$\(|\`/,
    ];

    const checkString = JSON.stringify({
      url: request.url,
      query: request.query,
      body: request.body,
      params: request.params,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        throw new BadRequestException('Suspicious content detected in request');
      }
    }
  }

  private async checkRequestFrequency(request: any): Promise<void> {
    const clientIp = this.getClientIp(request);
    const userId = request.user?.id || 'anonymous';
    const key = `${clientIp}:${userId}`;
    
    // This is a simplified check - in production, use Redis or similar
    // For now, we'll just check basic patterns
    
    // Check for rapid successive requests (basic protection)
    const userAgent = request.headers['user-agent'];
    if (!userAgent || userAgent.length < 5) {
      throw new BadRequestException('Invalid user agent');
    }
    
    // Check for suspiciously long URLs
    if (request.url && request.url.length > 2000) {
      throw new BadRequestException('Request URL too long');
    }
  }

  private getClientIp(request: any): string {
    return request.ip ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           (request.connection?.socket ? request.connection.socket.remoteAddress : null) ||
           request.headers['x-forwarded-for']?.split(',')[0] ||
           request.headers['x-real-ip'] ||
           'unknown';
  }
}