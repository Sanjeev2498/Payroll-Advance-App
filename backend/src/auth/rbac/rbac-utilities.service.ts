import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RbacService } from './rbac.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { Permission } from '../enums/permissions.enum';
import { RolePermissionsConfig } from './role-permissions.config';

/**
 * Permission validation result
 */
export interface PermissionValidationResult {
  allowed: boolean;
  reason: string;
  requiredPermissions?: Permission[];
  missingPermissions?: Permission[];
  alternativeActions?: string[];
}

/**
 * Dynamic permission rule configuration
 */
export interface DynamicPermissionRule {
  /** Rule identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Condition function that determines if rule applies */
  condition: (context: PermissionRuleContext) => boolean | Promise<boolean>;
  /** Required permissions for this rule */
  requiredPermissions?: Permission[];
  /** Custom validation function */
  validator?: (context: PermissionRuleContext) => boolean | Promise<boolean>;
  /** Priority (higher number = higher priority) */
  priority?: number;
}

/**
 * Context for permission rule evaluation
 */
export interface PermissionRuleContext {
  userId: string | null;
  userRole: UserRole | null;
  tenantId: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceData?: any;
  requestData?: any;
  timestamp: Date;
}

/**
 * RBAC Utilities Service
 * Provides advanced permission validation, dynamic rules, and utility functions
 */
@Injectable()
export class RbacUtilitiesService {
  private readonly logger = new Logger(RbacUtilitiesService.name);
  private readonly dynamicRules: Map<string, DynamicPermissionRule> = new Map();

  constructor(
    private readonly rbacService: RbacService,
    private readonly tenantContextService: TenantContextService,
  ) {
    this.initializeDefaultRules();
  }

  /**
   * Validate permissions with detailed result information
   */
  async validatePermissions(
    requiredPermissions: Permission[],
    action: string,
    resourceData?: any
  ): Promise<PermissionValidationResult> {
    const context: PermissionRuleContext = {
      userId: this.tenantContextService.getUserId(),
      userRole: this.tenantContextService.getUserRole() as UserRole,
      tenantId: this.tenantContextService.getTenantId(),
      action,
      resourceData,
      timestamp: new Date(),
    };

    // Check if user has all required permissions
    const userPermissions = this.rbacService.getUserPermissions();
    const missingPermissions = requiredPermissions.filter(
      permission => !userPermissions.includes(permission)
    );

    if (missingPermissions.length === 0) {
      return {
        allowed: true,
        reason: 'User has all required permissions',
        requiredPermissions,
      };
    }

    // Check for dynamic rules that might allow access
    const applicableRules = await this.getApplicableRules(context);
    
    for (const rule of applicableRules) {
      if (rule.validator) {
        try {
          const ruleResult = await rule.validator(context);
          if (ruleResult) {
            return {
              allowed: true,
              reason: `Access granted by dynamic rule: ${rule.description}`,
              requiredPermissions,
              missingPermissions,
            };
          }
        } catch (error) {
          this.logger.error(`Error evaluating dynamic rule ${rule.id}:`, error);
        }
      }
    }

    // Generate alternative actions if available
    const alternatives = this.generateAlternativeActions(context, missingPermissions);

    return {
      allowed: false,
      reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
      requiredPermissions,
      missingPermissions,
      alternativeActions: alternatives,
    };
  }

  /**
   * Check if user can perform action with detailed context
   */
  async canPerformActionWithContext(
    action: string,
    resourceType?: string,
    resourceId?: string,
    resourceData?: any,
    requestData?: any
  ): Promise<PermissionValidationResult> {
    const context: PermissionRuleContext = {
      userId: this.tenantContextService.getUserId(),
      userRole: this.tenantContextService.getUserRole() as UserRole,
      tenantId: this.tenantContextService.getTenantId(),
      action,
      resourceType,
      resourceId,
      resourceData,
      requestData,
      timestamp: new Date(),
    };

    // Get applicable dynamic rules
    const applicableRules = await this.getApplicableRules(context);
    
    // Evaluate rules by priority
    for (const rule of applicableRules.sort((a, b) => (b.priority || 0) - (a.priority || 0))) {
      try {
        if (rule.requiredPermissions && rule.requiredPermissions.length > 0) {
          const hasPermissions = this.rbacService.hasAllPermissions(rule.requiredPermissions);
          if (!hasPermissions) {
            continue; // Skip rule if permissions not met
          }
        }

        if (rule.validator) {
          const ruleResult = await rule.validator(context);
          if (ruleResult) {
            return {
              allowed: true,
              reason: `Access granted by rule: ${rule.description}`,
            };
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    return {
      allowed: false,
      reason: `No applicable rules found for action: ${action}`,
    };
  }

  /**
   * Register a new dynamic permission rule
   */
  registerDynamicRule(rule: DynamicPermissionRule): void {
    this.dynamicRules.set(rule.id, rule);
    this.logger.debug(`Registered dynamic permission rule: ${rule.id}`);
  }

  /**
   * Remove a dynamic permission rule
   */
  unregisterDynamicRule(ruleId: string): void {
    this.dynamicRules.delete(ruleId);
    this.logger.debug(`Unregistered dynamic permission rule: ${ruleId}`);
  }

  /**
   * Get permission analysis for current user
   */
  getPermissionAnalysis(): {
    userRole: UserRole | null;
    permissions: Permission[];
    permissionCount: number;
    canManageRoles: UserRole[];
    hierarchyLevel: number;
    tenantAccess: {
      currentTenant: string | null;
      canAccessOtherTenants: boolean;
    };
  } {
    const userRole = this.tenantContextService.getUserRole() as UserRole;
    const permissions = this.rbacService.getUserPermissions();
    
    return {
      userRole,
      permissions,
      permissionCount: permissions.length,
      canManageRoles: userRole ? this.rbacService.getAssignableRoles() : [],
      hierarchyLevel: userRole ? RolePermissionsConfig.getRoleHierarchyLevel(userRole) : 0,
      tenantAccess: {
        currentTenant: this.tenantContextService.getTenantId(),
        canAccessOtherTenants: userRole === UserRole.SUPER_ADMIN,
      },
    };
  }

  /**
   * Generate permission requirements for a given action
   */
  generatePermissionRequirements(
    action: string,
    resourceType: string
  ): {
    minimumRole: UserRole | null;
    requiredPermissions: Permission[];
    alternatives: Array<{ description: string; permissions: Permission[] }>;
  } {
    // This would typically be configured based on business logic
    // For now, provide basic mapping based on action and resource type
    
    const actionPermissionMap: Record<string, Permission[]> = {
      'create_user': ['user:create' as Permission],
      'read_user': ['user:read' as Permission],
      'update_user': ['user:update' as Permission],
      'delete_user': ['user:delete' as Permission],
      'create_employee': ['employee:create' as Permission],
      'read_employee': ['employee:read' as Permission],
      'update_employee': ['employee:update' as Permission],
      'process_payroll': ['payroll:process' as Permission],
    };

    const key = `${action}_${resourceType}`.toLowerCase();
    const requiredPermissions = actionPermissionMap[key] || [];
    
    // Find minimum role that has these permissions
    let minimumRole: UserRole | null = null;
    for (const role of Object.values(UserRole)) {
      if (RolePermissionsConfig.hasAllPermissions(role, requiredPermissions)) {
        minimumRole = role;
        break;
      }
    }

    return {
      minimumRole,
      requiredPermissions,
      alternatives: [], // Could be enhanced with alternative permission sets
    };
  }

  /**
   * Get applicable dynamic rules for given context
   */
  private async getApplicableRules(context: PermissionRuleContext): Promise<DynamicPermissionRule[]> {
    const applicableRules: DynamicPermissionRule[] = [];

    for (const rule of this.dynamicRules.values()) {
      try {
        const isApplicable = await rule.condition(context);
        if (isApplicable) {
          applicableRules.push(rule);
        }
      } catch (error) {
        this.logger.error(`Error checking rule condition for ${rule.id}:`, error);
      }
    }

    return applicableRules;
  }

  /**
   * Generate alternative actions user can take
   */
  private generateAlternativeActions(
    context: PermissionRuleContext,
    missingPermissions: Permission[]
  ): string[] {
    const alternatives: string[] = [];

    // Add generic alternatives based on missing permissions
    if (missingPermissions.some(p => p.includes('create'))) {
      alternatives.push('Request creation permissions from your administrator');
    }
    
    if (missingPermissions.some(p => p.includes('update'))) {
      alternatives.push('Request edit permissions from your supervisor');
    }
    
    if (missingPermissions.some(p => p.includes('delete'))) {
      alternatives.push('Contact administrator for deletion requests');
    }

    // Add role-specific alternatives
    if (context.userRole && context.userRole !== UserRole.SUPER_ADMIN) {
      alternatives.push(`Current role: ${context.userRole}. Consider role upgrade request.`);
    }

    return alternatives;
  }

  /**
   * Initialize default dynamic permission rules
   */
  private initializeDefaultRules(): void {
    // Rule: Self-service profile access
    this.registerDynamicRule({
      id: 'self_profile_access',
      description: 'Users can access their own profile data',
      priority: 100,
      condition: (context) => 
        context.action === 'read' && 
        context.resourceType === 'user' &&
        context.resourceId === context.userId,
      validator: () => true,
    });

    // Rule: Emergency access during business hours
    this.registerDynamicRule({
      id: 'emergency_business_hours',
      description: 'Enhanced permissions during business hours for emergencies',
      priority: 50,
      condition: (context) => {
        const hour = context.timestamp.getHours();
        return hour >= 9 && hour <= 17; // 9 AM to 5 PM
      },
      validator: (context) => {
        // Could implement emergency escalation logic
        return false; // Disabled by default
      },
    });

    // Rule: Manager can access direct reports
    this.registerDynamicRule({
      id: 'manager_direct_reports',
      description: 'Managers can access their direct reports',
      priority: 75,
      condition: (context) =>
        context.userRole === UserRole.MANAGER || 
        context.userRole === UserRole.SUPERVISOR,
      validator: async (context) => {
        // In a real implementation, this would check if the resource
        // belongs to a direct report of the current user
        // For now, we'll return false (not implemented)
        return false;
      },
    });

    this.logger.log('Initialized default dynamic permission rules');
  }
}