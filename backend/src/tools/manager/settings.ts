import { prisma } from '../../lib/prisma.js';
import type { ToolDefinition } from '../../llm/types.js';
import type { ManagerToolContext, ManagerToolResult } from './index.js';
import { createAuditLog } from '../../services/audit.js';
import { forwardGeocode } from '../../services/google-maps.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const HH_MM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(v: string): boolean {
  return HH_MM_RE.test(v);
}

function isValidDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
}

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayCode = typeof VALID_DAYS[number];

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  try {
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function validationError(reason: string): ManagerToolResult {
  return { success: false, result: reason, errorCode: 'VALIDATION_ERROR' };
}

async function fetchSettings(businessId: string) {
  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId },
  });
  return settings;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const managerGetRestaurantSettingsDefinition: ToolDefinition = {
  name: 'manager_get_restaurant_settings',
  description:
    'Read the current operational settings for this restaurant: opening hours, order types, payment methods, weekly schedule, closure exceptions, language, and more. Call this before making any updates so you know what is already configured.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const managerUpdateRestaurantSettingsDefinition: ToolDefinition = {
  name: 'manager_update_restaurant_settings',
  description:
    'Update one or more operational settings for this restaurant. Only the fields you provide are changed — omitted fields keep their current value.',
  parameters: {
    type: 'object',
    properties: {
      openingTime: {
        type: 'string',
        description: 'Daily opening time in HH:MM format (24-hour). Example: "09:00".',
      },
      closingTime: {
        type: 'string',
        description: 'Daily closing time in HH:MM format (24-hour). Example: "23:00".',
      },
      currency: {
        type: 'string',
        description: 'ISO 4217 currency code. Example: "SAR", "USD", "AED".',
      },
      phoneNumber: {
        type: 'string',
        description: 'Public contact phone number shown to customers.',
      },
      deliveryEnabled: {
        type: 'boolean',
        description: 'Whether the restaurant accepts delivery orders.',
      },
      dineInEnabled: {
        type: 'boolean',
        description: 'Whether dine-in orders are accepted.',
      },
      pickupEnabled: {
        type: 'boolean',
        description: 'Whether pickup (takeaway) orders are accepted.',
      },
      estimatedPrepTimeMinutes: {
        type: 'integer',
        minimum: 1,
        description: 'Estimated preparation time in minutes shown to customers.',
      },
      paymentMethods: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of accepted payment methods. Example: ["cash","card","apple_pay"].',
      },
      defaultLanguage: {
        type: 'string',
        description: 'Default language for the AI agent responses. Example: "ar" or "en".',
      },
      minOrderValue: {
        type: 'number',
        minimum: 0,
        description: 'Minimum order total required to place an order.',
      },
      maxOrderItemCount: {
        type: 'integer',
        minimum: 1,
        description: 'Maximum number of items allowed per order. Omit or set to null to remove the cap.',
        nullable: true,
      },
      cancellationPolicy: {
        type: 'string',
        description: 'Cancellation policy text shown to customers (max 1000 characters).',
      },
    },
    required: [],
  },
};

export const managerSetTemporarilyClosedDefinition: ToolDefinition = {
  name: 'manager_set_temporarily_closed',
  description:
    'Toggle the restaurant\'s temporary-closure flag. When on, the AI agent will inform customers that the restaurant is temporarily closed. Use durationMinutes to note how long the closure will last (informational only — the flag must be manually turned off).',
  parameters: {
    type: 'object',
    properties: {
      on: {
        type: 'boolean',
        description: 'true to mark the restaurant as temporarily closed, false to reopen it.',
      },
      durationMinutes: {
        type: 'integer',
        minimum: 1,
        description: 'Optional: how many minutes the closure is expected to last. Recorded in the audit log.',
      },
    },
    required: ['on'],
  },
};

export const managerUpdateWeeklyScheduleDefinition: ToolDefinition = {
  name: 'manager_update_weekly_schedule',
  description:
    'Set the weekly operating schedule. Each entry specifies whether the restaurant is open on a given day and the opening/closing times for that day. Replaces the entire schedule — include all days you want to configure.',
  parameters: {
    type: 'object',
    properties: {
      schedule: {
        type: 'array',
        description: 'Array of day schedules.',
        items: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              enum: [...VALID_DAYS],
              description: 'Three-letter day code: mon, tue, wed, thu, fri, sat, sun.',
            },
            open: {
              type: 'boolean',
              description: 'Whether the restaurant is open on this day.',
            },
            from: {
              type: 'string',
              description: 'Opening time in HH:MM format (24-hour).',
            },
            to: {
              type: 'string',
              description: 'Closing time in HH:MM format (24-hour).',
            },
          },
          required: ['day', 'open', 'from', 'to'],
        },
      },
    },
    required: ['schedule'],
  },
};

export const managerAddClosureExceptionDefinition: ToolDefinition = {
  name: 'manager_add_closure_exception',
  description:
    'Mark a specific date as a closure day (e.g. a public holiday). The date is appended to the closure exceptions list — the restaurant will be treated as closed on that date even if the weekly schedule says otherwise.',
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Date to mark as closed, in YYYY-MM-DD format. Example: "2025-12-25".',
      },
    },
    required: ['date'],
  },
};

export const managerUpdateAddressDefinition: ToolDefinition = {
  name: 'manager_update_address',
  description:
    'Update the restaurant\'s physical address. If latitude and longitude are not provided, the coordinates will be automatically resolved via geocoding. Provide lat/lng to skip geocoding and set them directly.',
  parameters: {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description: 'Full physical address of the restaurant.',
      },
      lat: {
        type: 'number',
        description: 'Optional latitude. If omitted, coordinates are geocoded from the address.',
      },
      lng: {
        type: 'number',
        description: 'Optional longitude. If omitted, coordinates are geocoded from the address.',
      },
    },
    required: ['address'],
  },
};

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleManagerGetRestaurantSettings(
  _args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const settings = await fetchSettings(ctx.businessId);
  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  const paymentMethods = parseJsonArray<string>(settings.paymentMethods, ['cash', 'card']);
  const weeklySchedule = parseJsonArray<unknown>(settings.weeklySchedule, []);
  const closureExceptions = parseJsonArray<string>(settings.closureExceptions, []);

  const orderTypes: string[] = [];
  if (settings.deliveryEnabled) orderTypes.push('delivery');
  if (settings.dineInEnabled) orderTypes.push('dine-in');
  if (settings.pickupEnabled) orderTypes.push('pickup');

  const lines = [
    `**Status:** ${settings.isTemporarilyClosed ? 'TEMPORARILY CLOSED' : 'Open'}`,
    `**Opening Hours:** ${settings.openingTime} – ${settings.closingTime}`,
    `**Currency:** ${settings.currency}`,
    `**Phone:** ${settings.phoneNumber || '(not set)'}`,
    `**Default Language:** ${settings.defaultLanguage}`,
    `**Order Types:** ${orderTypes.length > 0 ? orderTypes.join(', ') : '(none enabled)'}`,
    `**Estimated Prep Time:** ${settings.estimatedPrepTimeMinutes != null ? `${settings.estimatedPrepTimeMinutes} min` : '(not set)'}`,
    `**Payment Methods:** ${paymentMethods.join(', ')}`,
    `**Min Order Value:** ${settings.minOrderValue}`,
    `**Max Items Per Order:** ${settings.maxOrderItemCount != null ? settings.maxOrderItemCount : '(no cap)'}`,
    `**Cancellation Policy:** ${settings.cancellationPolicy || '(not set)'}`,
    `**Address:** ${settings.address || '(not set)'}`,
    settings.latitude != null && settings.longitude != null
      ? `**Coordinates:** ${settings.latitude}, ${settings.longitude}`
      : `**Coordinates:** (not set)`,
    `**Weekly Schedule:** ${weeklySchedule.length > 0 ? JSON.stringify(weeklySchedule) : '(using default daily hours)'}`,
    `**Closure Exceptions:** ${closureExceptions.length > 0 ? closureExceptions.join(', ') : '(none)'}`,
  ];

  return { success: true, result: lines.join('\n') };
}

interface UpdateRestaurantSettingsArgs {
  openingTime?: string;
  closingTime?: string;
  currency?: string;
  phoneNumber?: string;
  deliveryEnabled?: boolean;
  dineInEnabled?: boolean;
  pickupEnabled?: boolean;
  estimatedPrepTimeMinutes?: number;
  paymentMethods?: string[];
  defaultLanguage?: string;
  minOrderValue?: number;
  maxOrderItemCount?: number | null;
  cancellationPolicy?: string;
}

export async function handleManagerUpdateRestaurantSettings(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const {
    openingTime,
    closingTime,
    currency,
    phoneNumber,
    deliveryEnabled,
    dineInEnabled,
    pickupEnabled,
    estimatedPrepTimeMinutes,
    paymentMethods,
    defaultLanguage,
    minOrderValue,
    maxOrderItemCount,
    cancellationPolicy,
  } = args as UpdateRestaurantSettingsArgs;

  // Validate before any DB access
  if (openingTime !== undefined && !isValidTime(openingTime)) {
    return validationError(`openingTime must be in HH:MM format (24-hour), got: "${openingTime}"`);
  }
  if (closingTime !== undefined && !isValidTime(closingTime)) {
    return validationError(`closingTime must be in HH:MM format (24-hour), got: "${closingTime}"`);
  }
  if (estimatedPrepTimeMinutes !== undefined && (typeof estimatedPrepTimeMinutes !== 'number' || estimatedPrepTimeMinutes < 1)) {
    return validationError('estimatedPrepTimeMinutes must be an integer >= 1');
  }
  if (minOrderValue !== undefined && (typeof minOrderValue !== 'number' || minOrderValue < 0)) {
    return validationError('minOrderValue must be a number >= 0');
  }
  if (maxOrderItemCount !== undefined && maxOrderItemCount !== null && (typeof maxOrderItemCount !== 'number' || maxOrderItemCount < 1)) {
    return validationError('maxOrderItemCount must be an integer >= 1, or null to remove the cap');
  }
  if (paymentMethods !== undefined) {
    if (!Array.isArray(paymentMethods) || paymentMethods.some((m) => typeof m !== 'string')) {
      return validationError('paymentMethods must be an array of strings');
    }
  }
  if (cancellationPolicy !== undefined && cancellationPolicy.length > 1000) {
    return validationError('cancellationPolicy must be 1000 characters or fewer');
  }

  const settings = await fetchSettings(ctx.businessId);
  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  const patch: Record<string, unknown> = {};
  const changed: string[] = [];

  if (openingTime !== undefined) { patch.openingTime = openingTime; changed.push('openingTime'); }
  if (closingTime !== undefined) { patch.closingTime = closingTime; changed.push('closingTime'); }
  if (currency !== undefined) { patch.currency = currency; changed.push('currency'); }
  if (phoneNumber !== undefined) { patch.phoneNumber = phoneNumber; changed.push('phoneNumber'); }
  if (deliveryEnabled !== undefined) { patch.deliveryEnabled = deliveryEnabled; changed.push('deliveryEnabled'); }
  if (dineInEnabled !== undefined) { patch.dineInEnabled = dineInEnabled; changed.push('dineInEnabled'); }
  if (pickupEnabled !== undefined) { patch.pickupEnabled = pickupEnabled; changed.push('pickupEnabled'); }
  if (estimatedPrepTimeMinutes !== undefined) { patch.estimatedPrepTimeMinutes = estimatedPrepTimeMinutes; changed.push('estimatedPrepTimeMinutes'); }
  if (paymentMethods !== undefined) { patch.paymentMethods = JSON.stringify(paymentMethods); changed.push('paymentMethods'); }
  if (defaultLanguage !== undefined) { patch.defaultLanguage = defaultLanguage; changed.push('defaultLanguage'); }
  if (minOrderValue !== undefined) { patch.minOrderValue = minOrderValue; changed.push('minOrderValue'); }
  if (maxOrderItemCount !== undefined) { patch.maxOrderItemCount = maxOrderItemCount; changed.push('maxOrderItemCount'); }
  if (cancellationPolicy !== undefined) { patch.cancellationPolicy = cancellationPolicy; changed.push('cancellationPolicy'); }

  if (changed.length === 0) {
    return { success: false, result: 'No fields provided to update.', errorCode: 'NO_OP' };
  }

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: patch as Parameters<typeof prisma.restaurantSettings.update>[0]['data'],
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:settings:update',
    resource: 'RestaurantSettings',
    resourceId: settings.id,
    details: { changed, managerId: ctx.managerId },
  });

  const summary = changed.map((f) => `• ${f}`).join('\n');
  return {
    success: true,
    result: `Settings updated successfully. Changed fields:\n${summary}\n\nChanges are live immediately.`,
  };
}

interface SetTemporarilyClosedArgs {
  on: boolean;
  durationMinutes?: number;
}

export async function handleManagerSetTemporarilyClosed(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { on, durationMinutes } = args as SetTemporarilyClosedArgs;

  if (typeof on !== 'boolean') {
    return validationError('The "on" field must be a boolean (true or false)');
  }
  if (durationMinutes !== undefined && (typeof durationMinutes !== 'number' || durationMinutes < 1)) {
    return validationError('durationMinutes must be an integer >= 1');
  }

  const settings = await fetchSettings(ctx.businessId);
  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: { isTemporarilyClosed: on },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:settings:temp_close',
    resource: 'RestaurantSettings',
    resourceId: settings.id,
    details: {
      isTemporarilyClosed: on,
      durationMinutes: durationMinutes ?? null,
      managerId: ctx.managerId,
    },
  });

  const statusLabel = on ? 'temporarily closed' : 'open again';
  const durationNote = on && durationMinutes
    ? ` Expected duration: ${durationMinutes} minutes.`
    : '';
  return {
    success: true,
    result: `Restaurant is now marked as ${statusLabel}.${durationNote} This action has been logged.`,
  };
}

interface WeeklyScheduleEntry {
  day: DayCode;
  open: boolean;
  from: string;
  to: string;
}

interface UpdateWeeklyScheduleArgs {
  schedule: WeeklyScheduleEntry[];
}

export async function handleManagerUpdateWeeklySchedule(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { schedule } = args as UpdateWeeklyScheduleArgs;

  if (!Array.isArray(schedule)) {
    return validationError('schedule must be an array of day entries');
  }

  for (const entry of schedule) {
    if (!VALID_DAYS.includes(entry.day as DayCode)) {
      return validationError(
        `Invalid day code "${entry.day}". Must be one of: ${VALID_DAYS.join(', ')}`,
      );
    }
    if (typeof entry.open !== 'boolean') {
      return validationError(`Entry for "${entry.day}" must have an "open" boolean field`);
    }
    if (!isValidTime(entry.from)) {
      return validationError(
        `Entry for "${entry.day}" has invalid "from" time "${entry.from}". Must be HH:MM (24-hour)`,
      );
    }
    if (!isValidTime(entry.to)) {
      return validationError(
        `Entry for "${entry.day}" has invalid "to" time "${entry.to}". Must be HH:MM (24-hour)`,
      );
    }
  }

  // Deduplicate: last entry wins if the same day appears more than once
  const dayMap = new Map<DayCode, WeeklyScheduleEntry>();
  for (const entry of schedule) {
    dayMap.set(entry.day as DayCode, entry);
  }
  const normalised = Array.from(dayMap.values());

  const settings = await fetchSettings(ctx.businessId);
  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: { weeklySchedule: JSON.stringify(normalised) },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:settings:schedule_update',
    resource: 'RestaurantSettings',
    resourceId: settings.id,
    details: { days: normalised.map((e) => e.day), managerId: ctx.managerId },
  });

  const scheduleLines = normalised.map((e) =>
    `• ${e.day}: ${e.open ? `${e.from}–${e.to}` : 'closed'}`,
  );
  return {
    success: true,
    result: `Weekly schedule updated:\n${scheduleLines.join('\n')}\n\nThis action has been logged.`,
  };
}

interface AddClosureExceptionArgs {
  date: string;
}

export async function handleManagerAddClosureException(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { date } = args as AddClosureExceptionArgs;

  if (!isValidDate(date)) {
    return validationError(
      `date must be a valid calendar date in YYYY-MM-DD format, got: "${date}"`,
    );
  }

  const settings = await fetchSettings(ctx.businessId);
  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  const existing = parseJsonArray<string>(settings.closureExceptions, []);
  if (existing.includes(date)) {
    return {
      success: true,
      result: `${date} is already in the closure exceptions list — no change made.`,
    };
  }

  const updated = [...existing, date].sort();

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: { closureExceptions: JSON.stringify(updated) },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:settings:closure_add',
    resource: 'RestaurantSettings',
    resourceId: settings.id,
    details: { date, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `${date} has been added as a closure exception. The restaurant will be treated as closed on that date. This action has been logged.`,
  };
}

interface UpdateAddressArgs {
  address: string;
  lat?: number;
  lng?: number;
}

export async function handleManagerUpdateAddress(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { address, lat, lng } = args as UpdateAddressArgs;

  if (typeof address !== 'string' || address.trim().length === 0) {
    return validationError('address must be a non-empty string');
  }

  const settings = await fetchSettings(ctx.businessId);
  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  let resolvedLat = lat;
  let resolvedLng = lng;
  let geocoded = false;

  if (resolvedLat == null || resolvedLng == null) {
    try {
      const result = await forwardGeocode(address.trim());
      resolvedLat = result.lat;
      resolvedLng = result.lng;
      geocoded = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown geocoding error';
      return {
        success: false,
        result: `Could not geocode address automatically: ${msg}. Please provide lat and lng manually.`,
        errorCode: 'GEOCODE_FAILED',
      };
    }
  }

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: {
      address: address.trim(),
      latitude: resolvedLat,
      longitude: resolvedLng,
    },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:settings:address_update',
    resource: 'RestaurantSettings',
    resourceId: settings.id,
    details: {
      address: address.trim(),
      lat: resolvedLat,
      lng: resolvedLng,
      geocoded,
      managerId: ctx.managerId,
    },
  });

  const coordNote = `Coordinates set to ${resolvedLat?.toFixed(6)}, ${resolvedLng?.toFixed(6)}${geocoded ? ' (auto-geocoded)' : ''}.`;
  return {
    success: true,
    result: `Address updated to: "${address.trim()}". ${coordNote} This action has been logged.`,
  };
}
