# IAM Implementation Plan: Multi-Tenant RBAC System

## Overview
Implement a complete Identity and Access Management system for the WhatsApp API backend, leveraging the existing Prisma schema (User, Role, Permission, UserRole, RolePermission, Session, AuditLog). The system provides JWT-based authentication, RBAC authorization middleware, and management APIs for users, roles, and sessions.

## Requirements
- JWT authentication with access/refresh token rotation
- RBAC middleware with permission checking
- User management (CRUD within tenant scope)
- Role management (create, assign permissions, assign to users)
- Session management (list, revoke)
- Audit logging for all auth events
- Password security (bcrypt, lockout after failed attempts)
- Multi-tenant isolation (all operations scoped to businessId)
- ABAC-ready architecture (attributes/conditions fields exist in schema)

## Architecture Changes

### New Dependencies
- `jsonwebtoken` - JWT token generation/verification
- `bcrypt` - Password hashing
- `@types/jsonwebtoken` - TypeScript types
- `@types/bcrypt` - TypeScript types

### New Files
| File | Purpose |
|------|---------|
| `backend/src/services/auth.ts` | Auth service: login, register, refresh, logout, password management |
| `backend/src/services/audit.ts` | Audit logging service |
| `backend/src/middleware/auth.ts` | JWT authentication middleware |
| `backend/src/middleware/rbac.ts` | RBAC authorization middleware |
| `backend/src/routes/auth.ts` | Auth routes: login, register, refresh, logout, me |
| `backend/src/routes/users.ts` | User management routes |
| `backend/src/routes/roles.ts` | Role management routes |
| `backend/src/routes/sessions.ts` | Session management routes |
| `backend/src/types/iam.ts` | IAM-specific TypeScript types |
| `backend/test/auth.test.ts` | Auth service unit tests |
| `backend/test/rbac.test.ts` | RBAC middleware unit tests |

### Modified Files
| File | Change |
|------|--------|
| `backend/src/index.ts` | Add IAM routes and middleware |
| `backend/src/types.ts` | Extend AuthRequest with user/session info |
| `backend/src/config.ts` | Add JWT secret, token TTL config |
| `backend/package.json` | Add jsonwebtoken, bcrypt dependencies |

## Implementation Steps

### Phase 1: Foundation (Dependencies & Config)
1. Install dependencies: `jsonwebtoken`, `bcrypt`, types
2. Add JWT config to `config.ts` (JWT_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL)
3. Create `types/iam.ts` with IAM interfaces
4. Extend Express Request in `types.ts`

### Phase 2: Core Services
1. Create `services/audit.ts` - Audit logging helper
2. Create `services/auth.ts` - Full auth service with:
   - register(businessId, email, password, name)
   - login(email, password)
   - refreshToken(refreshToken)
   - logout(refreshToken)
   - changePassword(userId, oldPassword, newPassword)
   - resetPassword(email)
   - handleFailedLogin(user)
3. Create tests for auth service

### Phase 3: Middleware
1. Create `middleware/auth.ts` - JWT verification middleware
2. Create `middleware/rbac.ts` - Permission checking middleware
   - requirePermission(permissionCode)
   - requireRole(roleName)
   - requireAnyPermission(codes[])
   - requireAllPermissions(codes[])
3. Create tests for RBAC middleware

### Phase 4: Routes
1. Create `routes/auth.ts` - Auth endpoints
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/refresh
   - POST /api/auth/logout
   - GET /api/auth/me
2. Create `routes/users.ts` - User management
   - GET /api/users (list, with pagination)
   - GET /api/users/:id
   - POST /api/users (create)
   - PATCH /api/users/:id (update)
   - DELETE /api/users/:id (deactivate)
   - POST /api/users/:id/roles (assign role)
   - DELETE /api/users/:id/roles/:roleId (remove role)
3. Create `routes/roles.ts` - Role management
   - GET /api/roles (list)
   - GET /api/roles/:id
   - POST /api/roles (create)
   - PATCH /api/roles/:id (update)
   - DELETE /api/roles/:id
   - POST /api/roles/:id/permissions (add permission)
   - DELETE /api/roles/:id/permissions/:permissionId
4. Create `routes/sessions.ts` - Session management
   - GET /api/sessions (list user's sessions)
   - DELETE /api/sessions/:id (revoke session)
   - DELETE /api/sessions/all (revoke all sessions)

### Phase 5: Integration
1. Update `index.ts` to mount IAM routes
2. Update existing routes to use RBAC middleware where appropriate
3. Run full test suite

### Phase 6: Security Review & Verification
1. Security audit of auth flows
2. Code review for patterns and quality
3. Database query review
4. Verification loop (build, lint, test)

## Testing Strategy
- Unit tests for auth service (login, register, token refresh, lockout)
- Unit tests for RBAC middleware (permission checks, role checks)
- Integration tests for auth routes
- Integration tests for user/role management routes
- E2E test: full login → access protected resource → refresh → logout flow

## Risks & Mitigations
- **Risk**: JWT secret not configured in production
  - Mitigation: Validate JWT_SECRET exists at startup, fail fast
- **Risk**: SQLite doesn't support concurrent writes well
  - Mitigation: Use Prisma connection pooling, note for production migration to PostgreSQL
- **Risk**: Password hashing slow in tests
  - Mitigation: Use lower bcrypt rounds in test environment
- **Risk**: Token replay attacks
  - Mitigation: Refresh token rotation, store refresh tokens in DB, revoke on use

## Success Criteria
- [ ] All auth endpoints functional and tested
- [ ] RBAC middleware correctly enforces permissions
- [ ] Multi-tenant isolation verified (tenant A cannot access tenant B data)
- [ ] Audit logs created for all auth events
- [ ] Password lockout works after 5 failed attempts
- [ ] Token refresh with rotation works
- [ ] Session revocation works
- [ ] 80%+ test coverage on new code
- [ ] TypeScript compiles without errors
- [ ] No security vulnerabilities in auth flows
