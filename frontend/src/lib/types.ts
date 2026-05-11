// ── Business / Tenant ──
export interface DualhookConnection {
  id: string;
  connectionId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  status: string;
  connectionMode?: string | null;
  heartbeatStatus?: string | null;
  heartbeatLastConfirmedAt?: string | null;
  heartbeatNextDueAt?: string | null;
  webhookUrl?: string | null;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  whatsappPhoneNumber?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappVerifyToken?: string | null;
  whatsappAppSecret?: string | null;
  hasAccessToken?: boolean;
  onboarding?: {
    phoneNumberId: boolean;
    accessToken: boolean;
    appSecret: boolean;
    isComplete: boolean;
  };
  dualhookConnections?: DualhookConnection[];
  createdAt: string;
}

export interface PlatformBusiness extends Business {
  apiKey: string;
  orderCount?: number;
  customerCount?: number;
  userCount?: number;
  complaintCount?: number;
  settings?: RestaurantSettings | null;
}

// ── Auth ──
export interface User {
  id: string;
  businessId: string | null;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  roles?: Role[];
  permissions?: string[];
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface BusinessRegisterPayload {
  businessName: string;
  email: string;
  password: string;
  name?: string;
}

export interface BusinessRegisterResponse extends AuthResponse {
  business: {
    id: string;
    name: string;
    apiKey: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── Menu ──
export interface Option {
  id: string;
  itemId: string;
  name: string;
  price: number;
}

export interface MenuCategory {
  id: string;
  businessId: string;
  name: string;
  nameAr?: string | null;
  sortOrder: number;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  basePrice: number | null;
  image?: string | null;
  available: boolean;
  categoryId: string;
  category?: MenuCategory;
  options?: Option[];
}

export interface MenuCategoryPayload {
  name: string;
  nameAr?: string;
  sortOrder?: number;
}

export interface MenuItemPayload {
  name: string;
  nameAr?: string;
  description?: string;
  basePrice: number | null;
  image?: string;
  categoryId: string;
  available?: boolean;
}

export interface OptionPayload {
  name: string;
  price: number;
}

// ── Menu Scan (Extracted from image) ──
export interface ExtractedItemOption {
  name: string;
  price: number;
}

export interface ExtractedMenuItem {
  name: string;
  nameAr?: string | null;
  description?: string | null;
  basePrice: number | null;
  options: ExtractedItemOption[];
}

export interface ExtractedCategory {
  name: string;
  nameAr?: string | null;
  items: ExtractedMenuItem[];
}

export interface ExtractedMenu {
  categories: ExtractedCategory[];
}

export interface BulkCreateResult {
  categoriesCreated: number;
  itemsCreated: number;
  optionsCreated: number;
}

// ── Orders ──
export interface Order {
  id: string;
  referenceId: string;
  businessId: string;
  customerId: string;
  status: OrderStatus;
  totalPrice: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  notes?: string | null;
  menuItem?: MenuItem;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

// ── Customers & Conversations ──
export interface Customer {
  id: string;
  businessId: string;
  phone: string;
  name?: string | null;
  createdAt: string;
  _count?: { messages: number };
  messages?: Message[];
}

export interface Message {
  id: string;
  customerId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sessionId: string;
  createdAt: string;
}

export interface ConversationDetail {
  customer: Customer;
  sessions: Record<string, Message[]>;
}

// ── Delivery Tier ──
export interface DeliveryTier {
  maxKm: number;
  fee: number;
}

// ── Settings ──
export interface RestaurantSettings {
  id: string;
  businessId: string;
  name: string;
  openingTime: string;
  closingTime: string;
  welcomeMsg: string;
  aiRules: string;
  currency: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  deliveryEnabled: boolean;
  dineInEnabled: boolean;
  pickupEnabled: boolean;
  deliveryTiers: string | null;
  maxDeliveryDistanceKm: number | null;
  estimatedPrepTimeMinutes: number | null;
  paymentMethods: string;
  isTemporarilyClosed: boolean;
  defaultLanguage: string;
}

export interface RestaurantSettingsPayload {
  name?: string;
  openingTime?: string;
  closingTime?: string;
  welcomeMsg?: string;
  aiRules?: string;
  currency?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phoneNumber?: string | null;
  deliveryEnabled?: boolean;
  dineInEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryTiers?: string | null;
  maxDeliveryDistanceKm?: number | null;
  estimatedPrepTimeMinutes?: number | null;
  paymentMethods?: string;
  isTemporarilyClosed?: boolean;
  defaultLanguage?: string;
}

// ── IAM: Roles & Permissions ──
export interface Role {
  id: string;
  businessId: string | null;
  name: string;
  description?: string | null;
  isSystem: boolean;
  conditions?: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
  permissionCount?: number;
  userCount?: number;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  createdAt: string;
}

export interface PermissionsResponse {
  permissions: Record<string, Permission[]>;
  flat: Permission[];
}

// ── Platform ──
export interface PlatformAnalytics {
  summary: {
    totalBusinesses: number;
    totalOrders: number;
    totalRevenue: number;
    ordersLast30Days: number;
    totalComplaints: number;
    complaintsLast30Days: number;
  };
  ordersByDay: Array<{ date: string; count: number }>;
  orderStatusBreakdown: Record<string, number>;
  topBusinesses: Array<{ id: string; name: string; orderCount: number }>;
}

export interface BusinessStats {
  businessId: string;
  totalOrders: number;
  ordersLast30Days: number;
  totalRevenue: number;
  orderStatusBreakdown: Record<string, number>;
}

export interface AuditLog {
  id: string;
  businessId: string;
  userId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: User;
  business?: Business;
}

export interface Complaint {
  id: string;
  businessId: string;
  customerId: string;
  content: string;
  status: "open" | "resolved" | "closed";
  createdAt: string;
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PlatformHealth {
  server: {
    status: string;
    uptime: number;
    nodeVersion: string;
    memoryUsage: { rss: number; heapTotal: number; heapUsed: number };
  };
  database: { status: string };
  stats: {
    totalOrders: number;
    totalBusinesses: number;
  };
}
