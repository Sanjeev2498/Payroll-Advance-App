/**
 * Comprehensive TenantContextService mock for testing
 * This provides all methods expected by tests and prevents "not a function" errors
 */

export const createTenantContextServiceMock = (overrides: Partial<any> = {}) => {
  let mockTenantId: string | null = null;
  let mockUserId: string | null = null;
  let mockUserRole: string | null = null;
  let mockIsContextSet: boolean = false;

  const mockService = {
    // Core context management
    setContext: jest.fn().mockImplementation((tenantId: string, userId?: string, userRole?: string) => {
      mockTenantId = tenantId;
      mockUserId = userId;
      mockUserRole = userRole;
      mockIsContextSet = true;
    }),
    
    getTenantId: jest.fn().mockImplementation(() => {
      if (!mockTenantId || !mockIsContextSet) {
        throw new Error('Tenant context not set. Ensure authentication middleware is properly configured.');
      }
      return mockTenantId;
    }),
    
    getUserId: jest.fn().mockImplementation(() => mockUserId),
    getUserRole: jest.fn().mockImplementation(() => mockUserRole),
    
    hasContext: jest.fn().mockImplementation(() => mockIsContextSet && mockTenantId !== null),
    
    clearContext: jest.fn().mockImplementation(() => {
      mockTenantId = null;
      mockUserId = null;
      mockUserRole = null;
      mockIsContextSet = false;
    }),
    
    getContext: jest.fn().mockImplementation(() => ({
      tenantId: mockTenantId,
      userId: mockUserId,
      userRole: mockUserRole,
      isSet: mockIsContextSet,
    })),
    
    getContextSnapshot: jest.fn().mockImplementation(() => 
      `Context[tenant:${mockTenantId},user:${mockUserId},role:${mockUserRole},set:${mockIsContextSet}]`
    ),
    
    // Authorization methods
    validateTenantAccess: jest.fn().mockImplementation((requiredTenantId: string) => {
      if (!mockIsContextSet || !mockTenantId) return false;
      if (mockUserRole === 'SUPER_ADMIN') return true;
      return mockTenantId === requiredTenantId;
    }),
    
    isAdmin: jest.fn().mockImplementation(() => 
      mockUserRole === 'SUPER_ADMIN' || mockUserRole === 'COMPANY_ADMIN'
    ),
    
    hasRole: jest.fn().mockImplementation((role: string) => mockUserRole === role),
    
    hasAnyRole: jest.fn().mockImplementation((roles: string[]) => 
      mockUserRole ? roles.includes(mockUserRole) : false
    ),
    
    // Internal state access for testing
    _getMockState: () => ({
      tenantId: mockTenantId,
      userId: mockUserId,
      userRole: mockUserRole,
      isContextSet: mockIsContextSet,
    }),
    
    _setMockState: (state: any) => {
      mockTenantId = state.tenantId || null;
      mockUserId = state.userId || null;
      mockUserRole = state.userRole || null;
      mockIsContextSet = state.isContextSet || false;
    },
    
    // Apply overrides
    ...overrides,
  };

  return mockService;
};

/**
 * Default tenant context mock with common test data
 */
export const mockTenantContextService = createTenantContextServiceMock({
  // Default to admin context for most tests
  _setInitialState: () => {
    const mock = createTenantContextServiceMock();
    mock.setContext('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'COMPANY_ADMIN');
    return mock;
  },
});

/**
 * Creates a mock with preset values commonly used in tests
 */
export const createPresetTenantContextMock = (presetType: 'admin' | 'manager' | 'employee' | 'empty' = 'admin') => {
  const mock = createTenantContextServiceMock();
  
  // Using proper UUIDs instead of string IDs for database compatibility
  switch (presetType) {
    case 'admin':
      mock.setContext('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'COMPANY_ADMIN');
      break;
    case 'manager':
      mock.setContext('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'SITE_MANAGER');
      break;
    case 'employee':
      mock.setContext('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440003', 'EMPLOYEE');
      break;
    case 'empty':
      // Leave empty - no context set
      break;
  }
  
  return mock;
};

export default createTenantContextServiceMock;