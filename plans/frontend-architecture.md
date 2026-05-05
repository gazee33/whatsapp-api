# Frontend Architecture Plan — WhatsApp API Restaurant Dashboard

**Date**: 2026-05-02
**Framework**: Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4
**Status**: Design Phase

---

## 1. Route Structure

All routes use Next.js App Router with **route groups** to isolate tenant vs. platform UI (separate layouts, sidebars, and auth guards).

```
app/
│
├── layout.tsx                        # Root: <ThemeProvider> + <Toaster> + fonts
├── page.tsx                          # Landing: auto-redirect to /login or /dashboard
├── not-found.tsx                     # Generic 404
│
├── (auth)/                           # 🅰️ Auth pages (no sidebar, centered card layout)
│   ├── layout.tsx                    # Minimal layout: bg-brand-gradient, centered card
│   ├── login/page.tsx                # Business user login (x-api-key needed)
│   ├── platform-login/page.tsx       # Platform admin login (email + password only)
│   └── register/page.tsx             # Business registration (x-api-key needed)
│
├── (dashboard)/                      # 🏪 Tenant dashboard (sidebar + socket)
│   ├── layout.tsx                    # TenantShell: TenantSidebar + TenantHeader + SocketProvider
│   ├── page.tsx                      # Dashboard home: stats cards, recent orders, live feed
│   ├── menu/page.tsx                 # Menu: category list → expand → item list, search bar
│   ├── orders/
│   │   ├── page.tsx                  # Orders: filterable table (status tabs + search)
│   │   └── [orderId]/page.tsx        # Order detail: items, timeline, status actions
│   ├── conversations/
│   │   ├── page.tsx                  # Split-pane: customer list (left) + chat (right)
│   │   └── [phone]/page.tsx          # Deep-link to specific customer chat
│   ├── settings/page.tsx             # Restaurant settings form
│   └── users/
│       ├── page.tsx                  # User list (IAM)
│       ├── roles/page.tsx            # Role CRUD
│       └── permissions/page.tsx      # Permission catalog (read-only)
│
├── (platform)/                       # 🏛️ Platform admin dashboard
│   ├── layout.tsx                    # PlatformShell: PlatformSidebar + PlatformHeader
│   ├── page.tsx                      # Platform overview: big metric cards, charts
│   ├── businesses/
│   │   ├── page.tsx                  # Business table (search, paginate)
│   │   └── [businessId]/page.tsx     # Business detail + stats + settings
│   ├── analytics/page.tsx            # Full platform analytics page
│   ├── settings/page.tsx             # Platform settings
│   ├── users/page.tsx                # Platform user management
│   └── audit-logs/page.tsx           # Audit log viewer (filterable table)
│
└── api/auth/refresh/route.ts         # Next.js API route: proxies refresh to backend
```

### Route Group Rationale
| Group | Layout | Auth Check | Sidebar |
|-------|--------|-----------|---------|
| `(auth)` | Centered card, brand background | Redirect if already logged in | None |
| `(dashboard)` | Sidebar + topbar + main content | Require tenant token + x-api-key | TenantSidebar |
| `(platform)` | Sidebar + topbar + main content | Require platform token | PlatformSidebar |

---

## 2. Complete Folder Structure

```
frontend/src/
│
├── app/                              # Next.js App Router (see §1 above)
│
├── components/
│   │
│   ├── ui/                           # 🔲 Primitive UI (Radix wrappers + Tailwind)
│   │   ├── button.tsx                # 5 variants: default, outline, ghost, destructive, link
│   │   ├── card.tsx                  # Card, CardHeader, CardTitle, CardContent
│   │   ├── input.tsx                 # Styled input with error/disabled states
│   │   ├── select.tsx                # Radix Select wrapper (with search variant)
│   │   ├── dialog.tsx                # Modal dialog with overlay
│   │   ├── popover.tsx               # Popover for dropdowns/date pickers
│   │   ├── dropdown-menu.tsx         # Right-click/dot-menu actions
│   │   ├── tabs.tsx                  # Horizontal tab switcher
│   │   ├── badge.tsx                 # Inline status badge (success/warning/danger/info)
│   │   ├── avatar.tsx                # Radix Avatar wrapper
│   │   ├── tooltip.tsx               # Hover tooltip
│   │   ├── separator.tsx             # Horizontal/vertical divider
│   │   ├── skeleton.tsx              # Loading skeleton (card/row/text variants)
│   │   ├── data-table.tsx            # Generic table: sortable headers, pagination, loading
│   │   ├── toast.tsx                 # Sonner <Toaster /> config + toast helpers
│   │   ├── label.tsx                 # Form label
│   │   ├── switch.tsx                # Toggle switch
│   │   ├── scroll-area.tsx           # Custom scroll container
│   │   └── index.ts                  # Barrel export
│   │
│   ├── layouts/                      # 📐 Shell layouts
│   │   ├── TenantSidebar.tsx         # Nav: Home, Menu, Orders, Conversations, Settings, Users
│   │   ├── PlatformSidebar.tsx       # Nav: Overview, Businesses, Analytics, Settings, Users, Logs
│   │   ├── TenantHeader.tsx          # Search, socket indicator, theme toggle, user menu
│   │   ├── PlatformHeader.tsx        # Breadcrumbs, theme toggle, user menu
│   │   └── index.ts
│   │
│   ├── shared/                       # 🔁 Cross-feature components
│   │   ├── ThemeToggle.tsx           # Dark/light/system switcher
│   │   ├── StatusBadge.tsx           # Order status: pending→yellow, confirmed→blue, etc.
│   │   ├── EmptyState.tsx            # Empty list illustration + CTA
│   │   ├── ConfirmDialog.tsx         # "Are you sure?" modal (uses Dialog)
│   │   ├── SearchInput.tsx           # Debounced search with clear button
│   │   ├── LoadingSpinner.tsx        # Centered spinner
│   │   ├── ErrorBoundary.tsx         # React error boundary with retry
│   │   ├── PageHeader.tsx            # Page title + description + action slot
│   │   └── index.ts
│   │
│   ├── menu/                         # 🍽️ Menu management
│   │   ├── MenuCategoryList.tsx      # Expandable accordion of categories
│   │   ├── MenuCategoryCard.tsx      # Category header (name, item count, edit/delete)
│   │   ├── MenuCategoryForm.tsx      # Dialog form: name, nameAr, sortOrder
│   │   ├── MenuItemList.tsx          # Grid of item cards within a category
│   │   ├── MenuItemCard.tsx          # Item: name, price, available toggle, edit/delete
│   │   ├── MenuItemForm.tsx          # Dialog form: name, nameAr, description, price, category
│   │   ├── MenuSearchBar.tsx         # Search input that filters items across categories
│   │   └── index.ts
│   │
│   ├── orders/                       # 📦 Order management
│   │   ├── OrderList.tsx             # DataTable with status tabs + filters
│   │   ├── OrderCard.tsx             # Mobile card view (customer, items, status, time)
│   │   ├── OrderDetail.tsx           # Full detail: customer, items, timeline, notes
│   │   ├── OrderItems.tsx            # Line items table (name × qty = subtotal)
│   │   ├── OrderStatusSelect.tsx     # Dropdown to change status (validated)
│   │   ├── OrderTimeline.tsx         # Visual status progression (pending → delivered)
│   │   ├── OrderFilters.tsx          # Status tabs: All | Pending | Confirmed | Preparing | Ready | Delivered | Cancelled
│   │   └── index.ts
│   │
│   ├── conversations/                # 💬 Customer conversations
│   │   ├── ConversationList.tsx      # Left panel: scrollable customer list
│   │   ├── ConversationItem.tsx      # Customer row: avatar, name, last message, time, unread dot
│   │   ├── ConversationView.tsx      # Right panel: messages grouped by session
│   │   ├── MessageBubble.tsx         # Chat bubble (left=customer, right=bot)
│   │   ├── SessionGroup.tsx          # Session divider with date header
│   │   ├── ConversationEmpty.tsx     # "Select a conversation" placeholder
│   │   └── index.ts
│   │
│   ├── settings/                     # ⚙️ Restaurant settings
│   │   ├── RestaurantSettingsForm.tsx # Name, welcome message, currency
│   │   ├── BusinessHoursFields.tsx    # Opening/closing time pickers
│   │   ├── AIRulesEditor.tsx         # Textarea for AI guardrails
│   │   └── index.ts
│   │
│   ├── users/                        # 👥 Tenant IAM
│   │   ├── UserList.tsx              # DataTable: name, email, roles, active, actions
│   │   ├── UserForm.tsx              # Dialog form: email, password, name
│   │   ├── UserRoleSelect.tsx        # Multi-select chip for role assignment
│   │   ├── RoleList.tsx              # Card grid: role name, description, permissions
│   │   ├── RoleForm.tsx              # Dialog form: name, description, permission checkboxes
│   │   ├── PermissionList.tsx        # Grouped by category (read-only)
│   │   ├── PermissionBadge.tsx       # Chip displaying permission code
│   │   └── index.ts
│   │
│   ├── platform/                     # 🏛️ Platform admin
│   │   ├── BusinessList.tsx          # DataTable: name, phone, orders, customers, status
│   │   ├── BusinessCard.tsx          # Mobile card view
│   │   ├── BusinessForm.tsx          # Dialog form: name, whatsapp phone, phone ID
│   │   ├── BusinessStats.tsx         # Business stats page: orders, revenue, breakdown
│   │   ├── PlatformAnalytics.tsx     # Dashboard: big numbers, charts, top businesses
│   │   ├── StatsCard.tsx             # Metric card: icon, label, value, delta
│   │   ├── RevenueChart.tsx          # Bar chart: orders/revenue over time (CSS-based)
│   │   ├── OrderStatusPie.tsx        # Simple breakdown: status → count (CSS bars)
│   │   ├── AuditLogList.tsx          # DataTable: timestamp, user, action, resource, details
│   │   ├── PlatformUsersList.tsx     # DataTable of platform-level users
│   │   └── index.ts
│   │
│   └── auth/                         # 🔐 Authentication
│       ├── LoginForm.tsx             # Tenant login: API key (hidden field), email, password
│       ├── PlatformLoginForm.tsx     # Platform login: email, password
│       ├── RegisterForm.tsx          # Registration: email, password, name, confirm
│       └── index.ts
│
├── stores/                           # 🗄️ Zustand state management
│   ├── useAuthStore.ts               # Auth: user, accessToken, login(), logout(), refresh()
│   ├── useBusinessStore.ts           # Current business info
│   ├── useMenuStore.ts               # Categories + items, CRUD operations
│   ├── useOrdersStore.ts             # Orders list, selected order, status update
│   ├── useConversationsStore.ts      # Customer list, active conversation, messages
│   ├── useSettingsStore.ts           # Restaurant settings
│   ├── useSocketStore.ts             # Socket connection, event subscriptions
│   ├── useUsersStore.ts              # Tenant users CRUD
│   ├── useRolesStore.ts              # Roles CRUD
│   ├── usePermissionsStore.ts        # Permission catalog
│   ├── usePlatformStore.ts           # Businesses + analytics
│   ├── usePlatformSettingsStore.ts   # Platform settings
│   ├── useAuditLogsStore.ts          # Audit log entries
│   ├── useUIStore.ts                 # Sidebar open, active tab, mobile menu
│   └── index.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts                 # Axios instance factory
│   │   ├── tenant-client.ts          # Tenant client: x-api-key + Bearer, 401 → refresh
│   │   ├── platform-client.ts        # Platform client: Bearer, 401 → refresh
│   │   └── endpoints.ts              # All URL constants (DRY)
│   │
│   ├── utils/
│   │   ├── cn.ts                     # clsx + tailwind-merge helper
│   │   ├── format.ts                 # Date formatting, currency (SAR), phone formatting
│   │   ├── validators.ts             # Zod schemas (login, register, menu item, etc.)
│   │   └── constants.ts              # ORDER_STATUSES, PERMISSION_CATEGORIES, NAV_ITEMS
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts            # Debounced value hook
│   │   ├── usePagination.ts          # Page state: page, limit, total, next/prev
│   │   ├── useMediaQuery.ts          # Responsive breakpoint detection
│   │   └── useSocketEvent.ts         # Subscribe/unsubscribe helper
│   │
│   └── socket.ts                     # Socket.io client singleton (lazy init)
│
├── types/                            # 🏷️ TypeScript interfaces
│   ├── business.ts                   # Business, BusinessWithSettings
│   ├── menu.ts                       # MenuCategory, MenuItem, CreateMenuItemDto, etc.
│   ├── order.ts                      # Order, OrderItem, OrderStatus
│   ├── conversation.ts              # Customer, Message, Session
│   ├── settings.ts                   # RestaurantSettings
│   ├── auth.ts                       # LoginInput, RegisterInput, AuthUser, TokenPair
│   ├── user.ts                       # User, Role, Permission, UserRole
│   ├── platform.ts                   # PlatformAnalytics, BusinessStats, AuditLogEntry
│   ├── socket.ts                     # SocketEvent types
│   ├── api.ts                        # ApiResponse<T>, PaginatedResponse<T>
│   └── index.ts
│
└── middleware.ts                     # Auth guard: redirect unauthenticated users
```

---

## 3. Component Tree (Visual Hierarchy)

```
<RootLayout>
  <ThemeProvider>
    <Toaster />
    ├── (auth)/layout
    │   ├── LoginForm
    │   ├── PlatformLoginForm
    │   └── RegisterForm
    │
    ├── (dashboard)/layout  →  <TenantShell>
    │   ├── TenantSidebar  (sticky left)
    │   ├── TenantHeader   (sticky top)
    │   │   ├── SearchInput
    │   │   ├── SocketIndicator  (green/grey dot)
    │   │   ├── ThemeToggle
    │   │   └── UserMenu  (DropdownMenu)
    │   │
    │   └── <main>
    │       ├── / page  →  DashboardHome
    │       │   ├── StatsCard × 4 (orders today, revenue, active orders, complaints)
    │       │   └── OrderList (recent, compact)
    │       │
    │       ├── /menu  →  MenuPage
    │       │   ├── PageHeader + MenuSearchBar
    │       │   ├── MenuCategoryList
    │       │   │   └── MenuCategoryCard → MenuItemList → MenuItemCard
    │       │   └── MenuCategoryForm / MenuItemForm (Dialog)
    │       │
    │       ├── /orders  →  OrdersPage
    │       │   ├── PageHeader + OrderFilters
    │       │   └── OrderList → OrderCard
    │       │
    │       ├── /orders/[id]  →  OrderDetailPage
    │       │   └── OrderDetail
    │       │       ├── OrderItems
    │       │       ├── OrderTimeline
    │       │       └── OrderStatusSelect
    │       │
    │       ├── /conversations  →  ConversationsPage
    │       │   ├── ConversationList → ConversationItem
    │       │   └── ConversationView
    │       │       ├── SessionGroup → MessageBubble × N
    │       │       └── ConversationEmpty
    │       │
    │       ├── /settings  →  SettingsPage
    │       │   └── RestaurantSettingsForm
    │       │       ├── BusinessHoursFields
    │       │       └── AIRulesEditor
    │       │
    │       └── /users  →  UsersPage
    │           ├── UserList → UserForm (Dialog) → UserRoleSelect
    │           ├── RoleList → RoleForm (Dialog)
    │           └── PermissionList → PermissionBadge
    │
    └── (platform)/layout  →  <PlatformShell>
        ├── PlatformSidebar
        ├── PlatformHeader
        │   ├── Breadcrumbs
        │   ├── ThemeToggle
        │   └── UserMenu
        │
        └── <main>
            ├── /  →  PlatformOverview
            │   ├── StatsCard × 5 (businesses, orders, revenue, complaints, health)
            │   ├── RevenueChart
            │   ├── OrderStatusPie
            │   └── RecentBusinesses (compact table)
            │
            ├── /businesses  →  BusinessListPage
            │   ├── BusinessList → BusinessForm (Dialog)
            │   └── BusinessCard (mobile)
            │
            ├── /businesses/[id]  →  BusinessDetailPage
            │   ├── BusinessStats
            │   └── BusinessSettings (read/edit)
            │
            ├── /analytics  →  AnalyticsPage
            │   └── PlatformAnalytics (full-page version)
            │
            ├── /settings  →  PlatformSettingsPage
            ├── /users  →  PlatformUsersPage
            │   └── PlatformUsersList
            │
            └── /audit-logs  →  AuditLogsPage
                └── AuditLogList
```

---

## 4. Data Flow Architecture

### 4.1 Store Pattern

Each Zustand store follows a consistent pattern. Example for `useMenuStore`:

```typescript
// stores/useMenuStore.ts
interface MenuState {
  // Data
  categories: MenuCategoryWithItems[];
  selectedCategoryId: string | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: Record<string, boolean>;  // keyed by item/category ID
  error: string | null;

  // Actions
  fetchMenu: () => Promise<void>;
  createCategory: (data: CreateCategoryInput) => Promise<MenuCategory>;
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createItem: (data: CreateMenuItemInput) => Promise<MenuItem>;
  updateItem: (id: string, data: UpdateMenuItemInput) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleItemAvailability: (id: string) => Promise<void>;

  // Selectors
  getCategoryById: (id: string) => MenuCategoryWithItems | undefined;
  getItemById: (id: string) => MenuItem | undefined;
}
```

**Store Principles:**
- **No persistence middleware** — auth store uses `localStorage` for token only, everything else fetches fresh
- **Granular loading states** for optimistic UI updates (e.g., `isUpdating['item-123']`)
- **Error as string | null** — cleared on new fetch, set on failure
- **Selectors computed inline** (no `zustand/middleware` slice pattern — keeps it simple)

### 4.2 API Client Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    API Client Layer                       │
│                                                          │
│  lib/api/client.ts        ← Axios instance factory       │
│  ├── lib/api/tenant-client.ts   ← x-api-key + Bearer     │
│  └── lib/api/platform-client.ts ← Bearer only            │
│                                                          │
│  Both use interceptors:                                  │
│  1. Request:  attach token + api key                     │
│  2. Response: on 401 → attempt refresh → retry           │
│  3. Response: on refresh fail → logout → redirect        │
└──────────────────────────────────────────────────────────┘
```

**tenant-client.ts**:
```typescript
// Uses x-api-key from useAuthStore.getState().businessApiKey
// Uses Bearer token from useAuthStore.getState().accessToken
// Base URL: http://localhost:3001/api

tenantClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retried) {
      error.config._retried = true
      const newToken = await refreshAccessToken()  // calls /api/auth/refresh
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`
        return tenantClient(error.config)
      }
      // Refresh failed → force logout
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### 4.3 Auth Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                        │
│                                                                   │
│  TENANT LOGIN                  PLATFORM LOGIN                     │
│  ────────────                  ───────────────                    │
│  1. User enters email+pw       1. User enters email+pw            │
│  2. x-api-key from store       2. POST /api/auth/platform-login   │
│  3. POST /api/auth/login       3. Get { accessToken, user }       │
│  4. Get { accessToken, user }  4. Store in Zustand + localStorage │
│  5. Store in Zustand +         5. Navigate to /platform           │
│     localStorage                                                   │
│  6. Navigate to /dashboard                                        │
│                                                                   │
│  TOKEN REFRESH (automatic via interceptor)                        │
│  ────────────────────────────────────────                         │
│  • Backend sets refreshToken in httpOnly cookie                   │
│  • Axios interceptor catches 401                                   │
│  • Calls POST /api/auth/refresh (cookie auto-sent)                 │
│  • Gets new accessToken → retries original request                 │
│  • On failure → clear store → redirect to login                   │
│                                                                   │
│  LOGOUT                                                           │
│  ──────                                                           │
│  • POST /api/auth/logout (clears cookie)                          │
│  • Clear Zustand auth store                                       │
│  • Disconnect socket                                              │
│  • Redirect to /login                                             │
└──────────────────────────────────────────────────────────────────┘
```

### 4.4 Socket.io Real-Time Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO ARCHITECTURE                      │
│                                                                │
│  lib/socket.ts (singleton)                                      │
│  ├── connect(businessId: string)                                │
│  │   socket = io("http://localhost:3001", {                     │
│  │     transports: ["websocket"],                               │
│  │   })                                                         │
│  │   socket.emit("join", { room: `business:${businessId}` })   │
│  │   Bind event listeners                                       │
│  │                                                              │
│  ├── disconnect()                                               │
│  │   socket?.disconnect()                                       │
│  │   socket = null                                              │
│  │                                                              │
│  └── Events → Store dispatch                                    │
│      "new-message"    → useConversationsStore.pushMessage()    │
│      "new-order"      → useOrdersStore.insertOrder()           │
│      "order-updated"  → useOrdersStore.updateOrder()           │
│      "new-complaint"  → sonner.toast("New complaint received") │
│                                                                │
│  useSocketStore (Zustand)                                      │
│  ├── isConnected: boolean                                      │
│  ├── connect(businessId): void                                 │
│  │   → Only tenant, after auth + business fetch                │
│  ├── disconnect(): void                                        │
│  └── Triggered by:                                             │
│      • (dashboard)/layout.tsx useEffect on mount               │
│      • Disconnected on logout / unmount                        │
└────────────────────────────────────────────────────────────────┘
```

**Socket connection lifecycle:**
1. `(dashboard)/layout.tsx` mounts → reads `business.id` from store
2. Calls `useSocketStore.connect(businessId)` 
3. Registers event handlers that dispatch to data stores
4. On unmount/logout → `disconnect()`

### 4.5 Data Flow Diagram (Tenant)

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────┐
│  React   │───▶│  Zustand    │───▶│  API Client   │───▶│ Backend  │
│  Page    │    │  Store      │    │  (Axios)      │    │  :3001   │
│          │◀───│             │◀───│               │◀───│          │
└──────────┘    └─────────────┘    └──────────────┘    └──────────┘
                      ▲                                       │
                      │                                       │
                ┌─────┴──────┐                          ┌─────┴──────┐
                │  Socket.io  │◀──── websocket ────────│  Socket.io  │
                │  Client     │                         │  Server     │
                │  (events)   │                         │  (emit)     │
                └─────────────┘                         └─────────────┘
```

---

## 5. Key Design Decisions

### ADR-001: Zustand over Redux Toolkit / React Query

**Context**: Need state management for complex multi-feature dashboard with real-time events.

**Decision**: Use **Zustand v5** as the sole state management solution.

**Rationale**:
- simpler API than Redux — no boilerplate (actions, reducers, slices)
- works naturally with async actions (no thunk middleware)
- stores can access each other via `useOtherStore.getState()` — useful for auth-dependent actions
- supports fine-grained subscriptions (components only re-render on used slices)
- no provider wrapping needed (unlike Context)

**Trade-offs**:
- No built-in cache invalidation like React Query → handled manually via store actions
- No normalized cache → acceptable since data is tenant-scoped (single restaurant)

### ADR-002: Auth Token Storage

**Context**: JWT access tokens need to be sent with every API request.

**Decision**: Store `accessToken` in Zustand + `localStorage` for persistence across refreshes. Refresh token stays in httpOnly cookie (set by backend).

**Rationale**:
- `accessToken` in Zustand → available to Axios interceptor via `getState()`
- `localStorage` backup → survives hard refresh without re-login
- Refresh token in httpOnly cookie → XSS-resistant (JS cannot read it)
- Stack: persisting in Zustand wouldn't work across hard refresh without middleware

**Risk**: `localStorage` is vulnerable to XSS. Mitigation: short-lived access tokens (15 min), CSP headers, React's XSS protection.

### ADR-003: Route Groups for Tenant vs. Platform Separation

**Context**: Two completely different UI experiences sharing the same Next.js app.

**Decision**: Use Next.js **route groups** `(dashboard)` and `(platform)` with separate `layout.tsx` files.

**Rationale**:
- Each group gets its own sidebar, header, and auth guard
- URL paths stay clean: `/menu`, `/orders` (tenant) vs `/businesses`, `/analytics` (platform)
- No prop-drilling: layouts wrap children with the right shell
- `middleware.ts` can differentiate by checking token + businessId presence

### ADR-004: Axios Clients with Interceptors (not Server Actions)

**Context**: All API calls go to a separate Express backend on port 3001.

**Decision**: Use Axios client-side with interceptor-based auth, not Next.js Server Actions or Route Handlers.

**Rationale**:
- Backend is a separate process — no direct DB access from Next.js
- CORS is already configured for `http://localhost:3000`
- Token refresh requires reading cookies + performing retry — straightforward in Axios interceptors
- All data fetching is client-side (dashboard is behind auth, no SEO needs)

**One exception**: `app/api/auth/refresh/route.ts` — a Next.js API route that proxies the refresh call to keep cookies in the same domain (optional, only needed if CORS cookie issues arise).

### ADR-005: No Chart Library Initially

**Decision**: Use CSS-only data visualizations (bar charts, donut breakdowns) for MVP analytics. Evaluate Recharts or Tremor for v2.

**Rationale**:
- Analytics data is relatively simple (counts, sums, time series)
- CSS bars/circles are lightweight, theme-friendly, and avoid bundle bloat
- Platform analytics can be upgraded later when KPIs justify a charting lib

### ADR-006: Form Strategy — Controlled Components + Zod

**Decision**: Use React controlled components with Zod schema validation, no form library.

**Rationale**:
- Forms are relatively simple (5–10 fields max)
- Zod already provides excellent validation with TypeScript inference
- Avoiding React Hook Form / Formik reduces bundle size
- Reusable `input.tsx` and `select.tsx` components handle error display consistently

**Pattern**:
```typescript
const [formData, setFormData] = useState<FormData>({...})
const [errors, setErrors] = useState<Record<string, string>>({})

const handleSubmit = () => {
  const result = menuItemSchema.safeParse(formData)
  if (!result.success) {
    setErrors(formatZodErrors(result.error))
    return
  }
  await useMenuStore.getState().createItem(result.data)
}
```

### ADR-007: Mobile Strategy — Responsive Sidebar + Stacked Tables

**Decision**: Sidebar is a slide-over drawer on mobile (hamburger toggle). Tables become stacked card layouts below `md` breakpoint.

**Implementation**:
- `TenantSidebar`: `fixed inset-y-0 left-0 z-40` on desktop, `translate-x-[-100%]` on mobile until toggled
- `DataTable`: render `table` on `md+`, render `Card[]` on `sm` (via `useMediaQuery` or Tailwind `hidden md:block`)
- `ConversationsPage`: full-width chat on mobile (back button to return to list)

---

## 6. TypeScript Types Reference

### Core Domain Types

```typescript
// types/menu.ts
interface MenuCategory {
  id: string;
  name: string;
  nameAr: string | null;
  sortOrder: number;
  items?: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  price: number;
  available: boolean;
  categoryId: string;
  category?: MenuCategory;
}

interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

// types/order.ts
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  referenceId: string;
  businessId: string;
  customerId: string;
  customer: { phone: string; name: string | null };
  status: OrderStatus;
  totalPrice: number;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// types/conversation.ts
interface Customer {
  id: string;
  phone: string;
  name: string | null;
  messages: Message[];
  _count: { messages: number };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
  createdAt: string;
}

// types/auth.ts
interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  businessId: string | null;  // null = platform user
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  businessApiKey: string | null;  // Only for tenant
  isAuthenticated: boolean;
  isPlatform: boolean;
}

// types/api.ts
interface ApiResponse<T> {
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 7. CSS / Theming Strategy

### Tailwind CSS v4 Setup

Using `@tailwindcss/postcss` (v4 style — no separate `tailwind.config.ts` needed).

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a5f;
  
  --color-accent-500: #10b981;
  --color-accent-600: #059669;
  
  --color-surface: var(--color-zinc-50);
  --color-surface-dark: var(--color-zinc-900);
  
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

### Dark/Light Mode

- Uses `next-themes` with `ThemeProvider` attribute strategy (`class` mode)
- Tailwind `dark:` variants throughout
- Brand colors remain consistent across themes; surface/background invert
- `ThemeToggle` cycles: light → dark → system

### Component Variants (CVA)

```typescript
// components/ui/badge.tsx
import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200",
        success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
        danger:  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
        info:    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

---

## 8. Middleware (Route Protection)

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TENANT_ROUTES = /^\/(menu|orders|conversations|settings|users)/
const PLATFORM_ROUTES = /^\/(platform|businesses|analytics|audit-logs)/
const AUTH_ROUTES = /^\/(login|platform-login|register)/

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get('accessToken')?.value

  // If no token and trying to access protected route → redirect to login
  if (!token) {
    if (TENANT_ROUTES.test(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (PLATFORM_ROUTES.test(pathname)) {
      return NextResponse.redirect(new URL('/platform-login', request.url))
    }
  }

  // If token exists and on auth page → redirect to dashboard
  if (token && AUTH_ROUTES.test(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
}
```

---

## 9. Build Order (Implementation Sequence)

| Phase | Features | Dependencies |
|-------|----------|-------------|
| **1. Foundation** | UI primitives, theme, layouts, shell components | None |
| **2. Auth** | Login, platform-login, register, auth store, API clients, middleware | Phase 1 |
| **3. Menu** | Menu CRUD, item toggle, search | Phase 2 |
| **4. Orders** | Order list, detail, status update, filters | Phase 2 |
| **5. Conversations** | Customer list, chat viewer | Phase 2 |
| **6. Settings** | Restaurant settings form | Phase 2 |
| **7. IAM** | Users, roles, permissions (tenant) | Phase 2 |
| **8. Platform** | Business CRUD, analytics, audit logs | Phase 2 |
| **9. Real-time** | Socket connection, live order updates, toasts | Phases 3–5 |
| **10. Polish** | Loading states, error handling, empty states, mobile responsive | All |

---

## 10. Quick Reference: API ↔ Store ↔ Component Mapping

| Feature | API Endpoints | Store | Key Components |
|---------|--------------|-------|---------------|
| Auth (tenant) | `POST /auth/login`, `/auth/me`, `/auth/refresh` | `useAuthStore` | `LoginForm`, `RegisterForm` |
| Auth (platform) | `POST /auth/platform-login` | `useAuthStore` | `PlatformLoginForm` |
| Business | `GET /business` | `useBusinessStore` | `TenantHeader` (displays name) |
| Menu | `GET /menu`, `POST/PUT/DELETE /menu/*` | `useMenuStore` | `MenuCategoryList`, `MenuItemCard`, `MenuCategoryForm`, `MenuItemForm` |
| Orders | `GET /orders`, `GET /orders/:id`, `PUT /orders/:id/status` | `useOrdersStore` | `OrderList`, `OrderDetail`, `OrderStatusSelect` |
| Conversations | `GET /conversations`, `GET /conversations/:phone` | `useConversationsStore` | `ConversationList`, `ConversationView`, `MessageBubble` |
| Settings | `GET/PUT /settings` | `useSettingsStore` | `RestaurantSettingsForm` |
| Users (tenant) | `GET/POST/PUT/DELETE /users` | `useUsersStore` | `UserList`, `UserForm` |
| Roles | `GET/POST/PUT/DELETE /roles` | `useRolesStore` | `RoleList`, `RoleForm` |
| Permissions | `GET /permissions` | `usePermissionsStore` | `PermissionList` |
| Platform Businesses | `GET/POST/PUT/DELETE /platform/businesses`, `/stats` | `usePlatformStore` | `BusinessList`, `BusinessForm`, `BusinessStats` |
| Platform Analytics | `GET /platform/analytics` | `usePlatformStore` | `PlatformAnalytics`, `StatsCard` |
| Platform Settings | `GET/PUT /platform/settings` | `usePlatformSettingsStore` | Settings form |
| Platform Users | `GET/POST/DELETE /platform/users` | `usePlatformStore` | `PlatformUsersList` |
| Audit Logs | `GET /platform/audit-logs` | `useAuditLogsStore` | `AuditLogList` |
| Socket | `ws://localhost:3001` | `useSocketStore` | `SocketIndicator`, all feature stores |
