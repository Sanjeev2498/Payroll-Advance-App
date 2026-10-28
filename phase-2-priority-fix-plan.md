# Phase 2: Prioritized Fix Plan

**Generated**: ${new Date().toISOString()}  
**Based on**: 16 confirmed discrepancies from Phase 1 audit

---

## Priority 1: CRITICAL SECURITY FIXES (Immediate Action Required)

### 🚨 Issue #16: Global Security Guards Disabled
**Impact**: Complete security bypass vulnerability
**Location**: `backend/src/app.module.ts`
**Fix Required**: Re-enable JWT, Tenant, and Permission guards
**Risk**: All API endpoints unprotected
**Timeline**: Fix immediately before any other changes

### 🚨 Issue #15: Supervisor Portal Module Disabled  
**Impact**: Missing supervisor functionality
**Location**: `backend/src/app.module.ts`
**Fix Required**: Resolve DI issues and re-enable SupervisorPortalModule
**Risk**: Supervisor features completely unavailable

---

## Priority 2: HIGH-IMPACT API MISMATCHES (Business Critical)

### 🔥 Issue #3: Client API Response Structure Mismatch
**Impact**: Client management completely broken
**Locations**: 
- Frontend: `/src/lib/api/clients.ts`
- Backend: `/src/clients/dto/client-response.dto.ts`
**Fix Required**: 
- Update frontend to handle `total` instead of `totalCount`
- Add missing fields: `organizationType`, `tags`, `performanceMetrics`

### 🔥 Issue #4: Client Create/Update DTO Mismatch  
**Impact**: Client creation/editing broken
**Fix Required**: Complete rewrite of client form structures to match backend validation

### 🔥 Issue #6: Employee Model Complexity Gap
**Impact**: Payroll and compliance features unusable  
**Fix Required**: Add encrypted financial fields, compliance data to frontend

### 🔥 Issue #9: Contracts Module Missing Integration
**Impact**: Contract management unavailable
**Fix Required**: Create complete contracts frontend API and UI

---

## Priority 3: MEDIUM-IMPACT FUNCTIONAL GAPS

### ⚠️ Issue #5: Missing Client Organization Types
### ⚠️ Issue #10: Shift Templates Not Implemented  
### ⚠️ Issue #13: Sites API Response Alignment

---

## Priority 4: LOW-IMPACT VERIFICATION NEEDED

### ℹ️ Issue #14: Assignments API Verification
### ℹ️ Issue #11: Multi-Tenant Context Testing
### ℹ️ Issue #12: Encryption Field Handling

---

## Recommended Fix Sequence

1. **STOP**: Fix critical security guards first
2. **Client API**: Fix client management API alignment  
3. **Employee Model**: Add missing payroll fields
4. **Contracts**: Implement missing contracts integration
5. **Verification**: Test tenant context and assignments
6. **Enhancement**: Add organization types, shift templates

---

## Next Actions for Phase 3

Ready to start Phase 3 systematic fixes. Should I begin with:

**Option A**: Critical security fixes (guards re-enablement)
**Option B**: Client API fixes (business functionality) 
**Option C**: Employee model expansion (payroll features)

Which priority would you like me to tackle first?