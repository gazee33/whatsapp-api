# IAM Architecture — Multi-Tenant SaaS

## Overview
Design and implement a scalable, secure Identity and Access Management (IAM) system
for the WhatsApp API SaaS platform. Each Business = isolated tenant. RBAC with ABAC hooks.

## Design Decisions

### 1. Tenant Model
- **Existing `Business` IS the tenant** — no new Tenant model needed
- Each Business has its own Users, Roles, and data
- Tenant isolation enforced at middleware level (tenant_id on every query)

### 2. Authentication
- **JWT-based** access tokens (short-lived: 15min) + refresh tokens (7 days)
- **bcrypt** password hashing (cost factor 12)
- **Session model** for token revocation and device tracking
- **API key auth preserved** as fallback for existing webhook/integration flows

### 3. RBAC Model
- **Permission**: Global catalog of atomic permissions (e.g., "menu:read", "orders:write")
- **Role**: Per-tenant role with name, description, and assigned permissions
- **UserRole**: Junction linking users to roles within a tenant
- **Built-in roles**: `owner` (full access), `admin`, `manager`, `support`, `viewer`

### 4. ABAC Readiness
- User model has `attributes` JSON field for custom attributes (department, location, etc.)
- Role model has `conditions` JSON field for future attribute-based rules
- RBAC middleware exposes `req.user.attributes` for ABAC policy evaluation

### 5. Audit Logging
- All auth events (login, logout, token refresh, password change)
- All admin operations (user create/delete, role assignment, permission changes)
- Immutable append-only log with tenant context

### 6. Migration Strategy
- Phase A: Add IAM models, keep existing API key auth working
- Phase B: Add JWT auth middleware alongside API key middleware
- Phase C: Create admin user seeding, migrate dashboard to JWT
- Phase D: Deprecate API key for dashboard (keep for webhooks)

## Data Model

```
Tenant (Business) 1──N User
User N──M Role (via UserRole)
Role N──M Permission (via RolePermission)
User 1──N Session
Tenant 1──N AuditLog
```

## API Endpoints

### Auth
- POST /api/auth/register — Tenant admin creates first user
- POST /api/auth/login — Email/password → JWT
- POST /api/auth/refresh — Refresh token → new access token
- POST /api/auth/logout — Revoke session
- GET  /api/auth/me — Current user profile + roles + permissions

### Users (tenant-scoped)
- GET    /api/users — List users in tenant
- GET    /api/users/:id — Get user
- POST   /api/users — Create user
- PATCH  /api/users/:id — Update user
- DELETE /api/users/:id — Delete user
- POST   /api/users/:id/roles — Assign roles

### Roles (tenant-scoped)
- GET    /api/roles — List roles
- GET    /api/roles/:id — Get role
- POST   /api/roles — Create role
- PATCH  /api/roles/:id — Update role
- DELETE /api/roles/:id — Delete role

### Permissions (global catalog)
- GET /api/permissions — List all available permissions

### Audit
- GET /api/audit — List audit logs (admin only)

## Security Controls
- Rate limiting on auth endpoints (10 req/min for login)
- Password complexity requirements (min 8 chars, 1 upper, 1 number)
- Account lockout after 5 failed attempts (15 min cooldown)
- JWT stored in httpOnly cookies (not localStorage)
- Refresh token rotation on each use
- All admin endpoints require specific permissions
- Tenant isolation: every query scoped to req.tenant.id
