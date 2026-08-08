import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { ClientUserPermissions } from '../enums/permissions.enum';

/**
 * Test controller to demonstrate client user management functionality
 * This shows the API structure for the multi-user client access system
 */
@ApiTags('Client User Management (Test)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('client-users-test')
export class ClientUserTestController {
  
  @Get('overview')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get client user system overview',
    description: 'Demonstrates the multi-user client access system capabilities',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System overview retrieved successfully',
  })
  async getSystemOverview() {
    return {
      success: true,
      data: {
        systemName: 'Multi-User Client Access System',
        version: '1.0.0',
        features: {
          clientUserManagement: 'Full CRUD operations for client users',
          roleBasedAccess: 'Five distinct client user roles with specific permissions',
          invitationWorkflow: 'Email-based user invitation and activation',
          permissionMatrix: 'Fine-grained access controls per role',
          authentication: 'JWT-based authentication for client users',
          tenantIsolation: 'Complete data isolation between clients',
        },
        roles: {
          FACILITY_MANAGER: {
            description: 'Manages site operations, guard deployments, and service requests',
            permissions: ['view_deployments', 'request_replacements', 'manage_incidents'],
          },
          FINANCE_MANAGER: {
            description: 'Handles invoices, payments, billing analytics, and financial reporting',
            permissions: ['view_invoices', 'download_invoices', 'view_billing_analytics'],
          },
          SECURITY_MANAGER: {
            description: 'Oversees attendance, incidents, staffing, and security protocols',
            permissions: ['view_attendance', 'manage_incidents', 'view_security_reports'],
          },
          HR_MANAGER: {
            description: 'Manages employee compliance, workforce analytics, and HR reporting',
            permissions: ['view_workforce', 'view_compliance', 'view_hr_reports'],
          },
          REGIONAL_MANAGER: {
            description: 'Comprehensive multi-site oversight with strategic analytics',
            permissions: ['view_all_sites', 'cross_site_analytics', 'strategic_reporting'],
          },
        },
        workflows: {
          userInvitation: 'Create → Send Invitation → User Activation → Access Granted',
          permissionManagement: 'Role Assignment → Permission Mapping → Access Control',
          tenantIsolation: 'Company → Client → Users → Data Isolation',
        },
        implementation: {
          database: 'PostgreSQL with Row-Level Security for tenant isolation',
          authentication: 'JWT tokens with client-specific payload',
          authorization: 'Role-based permissions with hierarchical access',
          api: 'RESTful endpoints with comprehensive validation',
        },
      },
      message: 'Multi-user client access system is fully implemented and operational',
    };
  }

  @Get('roles')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get available client user roles',
    description: 'Lists all available client user roles with their descriptions and permissions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
  })
  async getClientRoles() {
    return {
      success: true,
      data: {
        roles: [
          {
            role: 'FACILITY_MANAGER',
            description: 'Manages site operations, guard deployments, and service requests',
            hierarchyLevel: 2,
            permissions: [
              'client_portal:view_dashboard',
              'client_portal:view_guard_deployments',
              'client_portal:request_guard_replacement',
              'client_portal:view_incidents',
              'client_portal:report_incidents',
              'client_portal:submit_service_requests',
            ],
          },
          {
            role: 'FINANCE_MANAGER',
            description: 'Handles invoices, payments, billing analytics, and financial reporting',
            hierarchyLevel: 2,
            permissions: [
              'client_portal:view_dashboard',
              'client_portal:view_billing_dashboard',
              'client_portal:view_invoices',
              'client_portal:download_invoices',
              'client_portal:view_payment_history',
              'client_portal:view_billing_analytics',
            ],
          },
          {
            role: 'SECURITY_MANAGER',
            description: 'Oversees attendance, incidents, staffing, and security protocols',
            hierarchyLevel: 3,
            permissions: [
              'client_portal:view_dashboard',
              'client_portal:view_attendance_dashboard',
              'client_portal:view_guard_deployments',
              'client_portal:view_incidents',
              'client_portal:report_incidents',
              'client_portal:view_compliance_reports',
            ],
          },
          {
            role: 'HR_MANAGER',
            description: 'Manages employee compliance, workforce analytics, and HR reporting',
            hierarchyLevel: 1,
            permissions: [
              'client_portal:view_dashboard',
              'client_portal:view_attendance_dashboard',
              'client_portal:view_guard_deployments',
              'client_portal:view_compliance_reports',
            ],
          },
          {
            role: 'REGIONAL_MANAGER',
            description: 'Comprehensive multi-site oversight with strategic analytics and reporting',
            hierarchyLevel: 4,
            permissions: [
              'client_portal:view_dashboard',
              'client_portal:view_multi_site_dashboard',
              'client_portal:view_cross_site_analytics',
              'client_portal:view_all_permissions',
            ],
          },
        ],
        totalRoles: 5,
        permissionCategories: [
          'Dashboard Access',
          'Deployment Management',
          'Attendance Monitoring',
          'Billing & Finance',
          'Incident Management',
          'Reporting & Analytics',
          'Multi-site Operations',
        ],
      },
      message: 'Client user roles retrieved successfully',
    };
  }

  @Post('simulate-invitation')
  @RequirePermissions(ClientUserPermissions.INVITE_CLIENT_USER)
  @ApiOperation({
    summary: 'Simulate client user invitation',
    description: 'Demonstrates the client user invitation workflow',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation simulated successfully',
  })
  async simulateInvitation(@Body() invitationData: {
    clientId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }) {
    // Simulate invitation process
    const mockInvitationToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_invitation_token';
    
    return {
      success: true,
      data: {
        invitation: {
          id: 'inv_123456789',
          clientId: invitationData.clientId,
          email: invitationData.email,
          firstName: invitationData.firstName,
          lastName: invitationData.lastName,
          role: invitationData.role,
          invitationToken: mockInvitationToken,
          invitationSent: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          createdAt: new Date().toISOString(),
        },
        workflow: {
          step1: 'User information validated and invitation record created',
          step2: 'Invitation email sent with activation link',
          step3: 'User will receive email with instructions to activate account',
          step4: 'Upon activation, user gains access based on assigned role permissions',
        },
        nextSteps: [
          'User clicks activation link in email',
          'User sets password and completes account setup',
          'User logs in and accesses role-specific portal features',
          'Company admin can monitor user activity and manage permissions',
        ],
      },
      message: 'Client user invitation simulated successfully',
    };
  }

  @Get('permission-matrix')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get client user permission matrix',
    description: 'Shows the complete permission matrix for all client user roles',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission matrix retrieved successfully',
  })
  async getPermissionMatrix() {
    return {
      success: true,
      data: {
        permissionMatrix: {
          dashboard: {
            'client_portal:view_dashboard': {
              FACILITY_MANAGER: true,
              FINANCE_MANAGER: true,
              SECURITY_MANAGER: true,
              HR_MANAGER: true,
              REGIONAL_MANAGER: true,
            },
            'client_portal:view_multi_site_dashboard': {
              FACILITY_MANAGER: false,
              FINANCE_MANAGER: false,
              SECURITY_MANAGER: false,
              HR_MANAGER: false,
              REGIONAL_MANAGER: true,
            },
          },
          deployments: {
            'client_portal:view_guard_deployments': {
              FACILITY_MANAGER: true,
              FINANCE_MANAGER: true,
              SECURITY_MANAGER: true,
              HR_MANAGER: true,
              REGIONAL_MANAGER: true,
            },
            'client_portal:request_guard_replacement': {
              FACILITY_MANAGER: true,
              FINANCE_MANAGER: false,
              SECURITY_MANAGER: true,
              HR_MANAGER: false,
              REGIONAL_MANAGER: true,
            },
          },
          attendance: {
            'client_portal:view_attendance_dashboard': {
              FACILITY_MANAGER: false,
              FINANCE_MANAGER: false,
              SECURITY_MANAGER: true,
              HR_MANAGER: true,
              REGIONAL_MANAGER: true,
            },
            'client_portal:view_attendance_records': {
              FACILITY_MANAGER: false,
              FINANCE_MANAGER: false,
              SECURITY_MANAGER: true,
              HR_MANAGER: true,
              REGIONAL_MANAGER: true,
            },
          },
          billing: {
            'client_portal:view_billing_dashboard': {
              FACILITY_MANAGER: false,
              FINANCE_MANAGER: true,
              SECURITY_MANAGER: false,
              HR_MANAGER: false,
              REGIONAL_MANAGER: true,
            },
            'client_portal:view_invoices': {
              FACILITY_MANAGER: false,
              FINANCE_MANAGER: true,
              SECURITY_MANAGER: false,
              HR_MANAGER: false,
              REGIONAL_MANAGER: true,
            },
          },
          incidents: {
            'client_portal:view_incidents': {
              FACILITY_MANAGER: true,
              FINANCE_MANAGER: false,
              SECURITY_MANAGER: true,
              HR_MANAGER: true,
              REGIONAL_MANAGER: true,
            },
            'client_portal:report_incidents': {
              FACILITY_MANAGER: true,
              FINANCE_MANAGER: false,
              SECURITY_MANAGER: true,
              HR_MANAGER: false,
              REGIONAL_MANAGER: true,
            },
          },
        },
        roleHierarchy: {
          HR_MANAGER: 1,
          FACILITY_MANAGER: 2,
          FINANCE_MANAGER: 2,
          SECURITY_MANAGER: 3,
          REGIONAL_MANAGER: 4,
        },
        accessControlNotes: {
          tenantIsolation: 'All client users can only access data for their own client organization',
          roleInheritance: 'Higher hierarchy roles include permissions from lower levels where applicable',
          dynamicPermissions: 'Permissions can be customized per client user if needed',
          auditTrail: 'All permission checks and access attempts are logged for compliance',
        },
      },
      message: 'Permission matrix retrieved successfully',
    };
  }

  @Get('authentication-flow')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get client user authentication flow',
    description: 'Explains the complete authentication and authorization flow for client users',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication flow information retrieved successfully',
  })
  async getAuthenticationFlow() {
    return {
      success: true,
      data: {
        authenticationFlow: {
          step1: {
            name: 'User Registration',
            description: 'Company admin creates client user account and sends invitation',
            endpoint: 'POST /api/client-users',
            requiredPermissions: ['client_user:create', 'client_user:invite'],
          },
          step2: {
            name: 'Account Activation',
            description: 'Client user receives invitation email and activates account',
            endpoint: 'POST /api/client-auth/activate',
            publicEndpoint: true,
          },
          step3: {
            name: 'Login',
            description: 'Client user logs in with email and password',
            endpoint: 'POST /api/client-auth/login',
            publicEndpoint: true,
            returns: 'JWT access token and refresh token',
          },
          step4: {
            name: 'Access Control',
            description: 'Each API request validates JWT and checks role-based permissions',
            middleware: ['ClientUserAuthGuard', 'ClientUserPermissionsGuard'],
            validation: 'Token validity, user status, and permission checks',
          },
          step5: {
            name: 'Token Refresh',
            description: 'Client user refreshes expired access token using refresh token',
            endpoint: 'POST /api/client-auth/refresh',
            publicEndpoint: true,
          },
          step6: {
            name: 'Logout',
            description: 'Client user logs out and invalidates session',
            endpoint: 'POST /api/client-auth/logout',
            requiresAuth: true,
          },
        },
        tokenStructure: {
          accessToken: {
            payload: {
              sub: 'client_user_id',
              email: 'user@client.com',
              role: 'CLIENT_USER_ROLE',
              clientId: 'client_uuid',
              companyId: 'company_uuid',
              userType: 'client_user',
              type: 'access',
            },
            expiresIn: '15 minutes',
          },
          refreshToken: {
            payload: {
              sub: 'client_user_id',
              type: 'refresh',
              userType: 'client_user',
            },
            expiresIn: '7 days',
          },
        },
        securityFeatures: {
          tenantIsolation: 'JWT includes company and client context for data isolation',
          roleBasedAccess: 'Permissions validated on every protected endpoint',
          sessionManagement: 'Refresh token rotation and secure session handling',
          auditLogging: 'All authentication events logged for security monitoring',
        },
      },
      message: 'Authentication flow information retrieved successfully',
    };
  }
}