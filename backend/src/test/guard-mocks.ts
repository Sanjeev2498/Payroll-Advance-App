import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthTestHelper } from './auth-test.helper';

/**
 * Mock implementations of security guards for Phase 3 testing
 */

@Injectable()
export class MockJwtAuthGuard {
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    
    // Simulate @Public() decorator check
    if (handler.name?.includes('public') || handler.name?.includes('Public')) {
      return true;
    }

    // For protected routes, add mock user to request
    const mockUser = AuthTestHelper.createMockAuthenticatedUser();
    request.user = mockUser;
    
    return true;
  }
}

@Injectable()
export class MockTenantGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Ensure user exists (should be set by JWT guard)
    if (!request.user) {
      request.user = AuthTestHelper.createMockAuthenticatedUser();
    }

    // Mock tenant context setup
    // In real implementation, this would set tenant context
    return true;
  }
}

@Injectable()
export class MockPermissionsGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Ensure user exists with proper permissions
    if (!request.user) {
      request.user = AuthTestHelper.createMockAuthenticatedUser();
    }

    // Mock permission validation - always allow for tests
    // In real implementation, this would check user permissions
    return true;
  }
}

/**
 * Factory function to create mock guards for different test scenarios
 */
export class GuardMockFactory {
  static createMockGuards() {
    return {
      JwtAuthGuard: MockJwtAuthGuard,
      TenantGuard: MockTenantGuard, 
      PermissionsGuard: MockPermissionsGuard,
    };
  }

  static createFailingAuthGuard() {
    @Injectable()
    class FailingJwtAuthGuard {
      async canActivate(): Promise<boolean> {
        return false; // Simulate auth failure
      }
    }
    return FailingJwtAuthGuard;
  }

  static createPublicOnlyGuard() {
    @Injectable()
    class PublicOnlyGuard {
      async canActivate(context: ExecutionContext): Promise<boolean> {
        const handler = context.getHandler();
        return handler.name?.includes('public') || handler.name?.includes('Public') || false;
      }
    }
    return PublicOnlyGuard;
  }
}