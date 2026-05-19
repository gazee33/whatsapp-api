import { prisma } from '../../lib/prisma.js';
import type { ToolDefinition } from '../../llm/types.js';
import type { ManagerToolContext, ManagerToolResult } from './index.js';
import { createAuditLog } from '../../services/audit.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJsonList(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function resolveItemByBusiness(
  id: string,
  businessId: string,
): Promise<{ id: string; name: string; categoryId: string } | null> {
  return prisma.menuItem.findFirst({
    where: { id, category: { businessId } },
    select: { id: true, name: true, categoryId: true },
  });
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const managerListMenuItemsDefinition: ToolDefinition = {
  name: 'manager_list_menu_items',
  description:
    'List menu items for this restaurant, optionally filtered by category or availability. Returns up to 50 items with their IDs, names, prices, and availability.',
  parameters: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'Only return items in this category (optional).',
      },
      availability: {
        type: 'boolean',
        description: 'Filter by availability: true = available only, false = unavailable only. Omit to return all.',
      },
    },
    required: [],
  },
};

export const managerCreateMenuItemDefinition: ToolDefinition = {
  name: 'manager_create_menu_item',
  description: 'Create a new menu item in a category.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'English item name (required, non-empty).' },
      nameAr: { type: 'string', description: 'Arabic item name (optional).' },
      categoryId: { type: 'string', description: 'ID of the category this item belongs to.' },
      basePrice: {
        type: 'number',
        description:
          'Base price in the restaurant\'s currency. Pass null or omit if the item is priced entirely via options.',
      },
      description: { type: 'string', description: 'Short description shown to customers (optional).' },
      allergens: {
        type: 'string',
        description: 'JSON array of allergen strings, e.g. \'["gluten","dairy"]\' (optional).',
      },
    },
    required: ['name', 'categoryId'],
  },
};

export const managerUpdateMenuItemDefinition: ToolDefinition = {
  name: 'manager_update_menu_item',
  description: 'Update one or more fields of an existing menu item. Only supplied patch fields are changed.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the menu item to update.' },
      patch: {
        type: 'object',
        description: 'Fields to update (all optional).',
        properties: {
          name: { type: 'string' },
          nameAr: { type: 'string' },
          description: { type: 'string' },
          basePrice: { type: 'number' },
          allergens: { type: 'string', description: 'JSON array of allergen strings.' },
          categoryId: { type: 'string' },
        },
      },
    },
    required: ['id', 'patch'],
  },
};

export const managerToggleItemAvailabilityDefinition: ToolDefinition = {
  name: 'manager_toggle_item_availability',
  description: 'Set an item\'s availability to on or off. Unavailable items are hidden from customers.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the menu item.' },
      available: { type: 'boolean', description: 'true = available, false = unavailable.' },
    },
    required: ['id', 'available'],
  },
};

export const managerDeleteMenuItemDefinition: ToolDefinition = {
  name: 'manager_delete_menu_item',
  description:
    'DESTRUCTIVE — permanently delete a menu item and all its options. Call ONLY after manager_confirm and the manager has tapped YES. This cannot be undone.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the menu item to delete.' },
    },
    required: ['id'],
  },
};

export const managerCreateCategoryDefinition: ToolDefinition = {
  name: 'manager_create_category',
  description: 'Create a new menu category.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'English category name (required, non-empty).' },
      nameAr: { type: 'string', description: 'Arabic category name (optional).' },
      sortOrder: {
        type: 'integer',
        description: 'Display order; lower numbers appear first (optional, default 0).',
      },
    },
    required: ['name'],
  },
};

export const managerUpdateCategoryDefinition: ToolDefinition = {
  name: 'manager_update_category',
  description: 'Update an existing menu category. Only supplied patch fields are changed.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the category to update.' },
      patch: {
        type: 'object',
        description: 'Fields to update (all optional).',
        properties: {
          name: { type: 'string' },
          nameAr: { type: 'string' },
          sortOrder: { type: 'integer' },
        },
      },
    },
    required: ['id', 'patch'],
  },
};

export const managerAddItemOptionDefinition: ToolDefinition = {
  name: 'manager_add_item_option',
  description: 'Add a selectable option (size, flavour, extra) to an existing menu item.',
  parameters: {
    type: 'object',
    properties: {
      itemId: { type: 'string', description: 'ID of the menu item.' },
      name: { type: 'string', description: 'Option label shown to customers (e.g. "Large").' },
      price: { type: 'number', description: 'Price for this option (0 if no extra charge).' },
    },
    required: ['itemId', 'name', 'price'],
  },
};

export const managerUpdateOptionDefinition: ToolDefinition = {
  name: 'manager_update_option',
  description: 'Update the name or price of an existing option.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the option to update.' },
      patch: {
        type: 'object',
        description: 'Fields to update (all optional).',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
      },
    },
    required: ['id', 'patch'],
  },
};

export const managerDeleteOptionDefinition: ToolDefinition = {
  name: 'manager_delete_option',
  description:
    'DESTRUCTIVE — permanently delete an option from a menu item. Call ONLY after manager_confirm and the manager has tapped YES.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the option to delete.' },
    },
    required: ['id'],
  },
};

export const managerFeatureItemDefinition: ToolDefinition = {
  name: 'manager_feature_item',
  description:
    'Add or remove a menu item from the restaurant\'s featured-items list. Featured items may be highlighted to customers.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the menu item.' },
      on: { type: 'boolean', description: 'true = add to featured, false = remove from featured.' },
    },
    required: ['id', 'on'],
  },
};

export const managerHideItemDefinition: ToolDefinition = {
  name: 'manager_hide_item',
  description:
    'Add or remove a menu item from the restaurant\'s hidden-items list. Hidden items are never shown to customers even if available is true.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the menu item.' },
      on: { type: 'boolean', description: 'true = hide from customers, false = unhide.' },
    },
    required: ['id', 'on'],
  },
};

// ── Handlers ──────────────────────────────────────────────────────────────────

interface ListMenuItemsArgs {
  categoryId?: string;
  availability?: boolean;
}

export async function handleManagerListMenuItems(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { categoryId, availability } = args as ListMenuItemsArgs;

  const items = await prisma.menuItem.findMany({
    where: {
      category: {
        businessId: ctx.businessId,
        ...(categoryId ? { id: categoryId } : {}),
      },
      ...(availability !== undefined ? { available: availability } : {}),
    },
    select: {
      id: true,
      name: true,
      nameAr: true,
      basePrice: true,
      available: true,
      category: { select: { id: true, name: true } },
      options: { select: { id: true, name: true, price: true } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    take: 50,
  });

  if (items.length === 0) {
    return { success: true, result: 'No menu items found matching those filters.' };
  }

  const lines = items.map((item) => {
    const price = item.basePrice != null ? `${item.basePrice}` : '(options only)';
    const avail = item.available ? 'available' : 'unavailable';
    const opts =
      item.options.length > 0
        ? ` | Options: ${item.options.map((o) => `${o.name} (${o.price}) [${o.id}]`).join(', ')}`
        : '';
    return `• [${item.id}] ${item.name}${item.nameAr ? ` / ${item.nameAr}` : ''} — ${price} — ${avail} (cat: ${item.category.name})${opts}`;
  });

  return { success: true, result: `Found ${items.length} item(s):\n${lines.join('\n')}` };
}

// ─────────────────────────────────────────────────────────────────────────────

interface CreateMenuItemArgs {
  name: string;
  nameAr?: string;
  categoryId: string;
  basePrice?: number | null;
  description?: string;
  allergens?: string;
}

export async function handleManagerCreateMenuItem(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { name, nameAr, categoryId, basePrice, description, allergens } = args as CreateMenuItemArgs;

  if (!name || !name.trim()) {
    return { success: false, result: 'Item name is required and cannot be empty.', errorCode: 'VALIDATION_ERROR' };
  }

  if (basePrice !== undefined && basePrice !== null && basePrice < 0) {
    return { success: false, result: 'basePrice must be >= 0.', errorCode: 'VALIDATION_ERROR' };
  }

  // Verify category belongs to this business
  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, businessId: ctx.businessId },
    select: { id: true, name: true },
  });

  if (!category) {
    return { success: false, result: `Category "${categoryId}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  const item = await prisma.menuItem.create({
    data: {
      name: name.trim(),
      nameAr: nameAr?.trim() ?? null,
      description: description?.trim() ?? null,
      allergens: allergens ?? null,
      basePrice: basePrice ?? null,
      hasOptions: false,
      categoryId,
      available: true,
    },
    select: { id: true, name: true },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:item_create',
    resource: 'MenuItem',
    resourceId: item.id,
    details: { name: item.name, categoryId, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Menu item "${item.name}" created successfully (ID: ${item.id}) in category "${category.name}". It is available by default.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface UpdateMenuItemArgs {
  id: string;
  patch: {
    name?: string;
    nameAr?: string;
    description?: string;
    basePrice?: number | null;
    allergens?: string;
    categoryId?: string;
  };
}

export async function handleManagerUpdateMenuItem(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id, patch } = args as UpdateMenuItemArgs;

  if (!id) {
    return { success: false, result: 'Item ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  if (patch.name !== undefined && !patch.name.trim()) {
    return { success: false, result: 'name cannot be empty.', errorCode: 'VALIDATION_ERROR' };
  }

  if (patch.basePrice !== undefined && patch.basePrice !== null && patch.basePrice < 0) {
    return { success: false, result: 'basePrice must be >= 0.', errorCode: 'VALIDATION_ERROR' };
  }

  const existing = await resolveItemByBusiness(id, ctx.businessId);
  if (!existing) {
    return { success: false, result: `Menu item "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  // If patch includes categoryId, verify it belongs to this business
  if (patch.categoryId) {
    const cat = await prisma.menuCategory.findFirst({
      where: { id: patch.categoryId, businessId: ctx.businessId },
      select: { id: true },
    });
    if (!cat) {
      return { success: false, result: `Category "${patch.categoryId}" not found for this business.`, errorCode: 'NOT_FOUND' };
    }
  }

  const changed = Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined);
  if (changed.length === 0) {
    return { success: false, result: 'No patch fields provided.', errorCode: 'NO_OP' };
  }

  await prisma.menuItem.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.nameAr !== undefined ? { nameAr: patch.nameAr } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.basePrice !== undefined ? { basePrice: patch.basePrice } : {}),
      ...(patch.allergens !== undefined ? { allergens: patch.allergens } : {}),
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
    },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:item_update',
    resource: 'MenuItem',
    resourceId: id,
    details: { changed, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Menu item "${existing.name}" updated. Changed fields: ${changed.join(', ')}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface ToggleItemAvailabilityArgs {
  id: string;
  available: boolean;
}

export async function handleManagerToggleItemAvailability(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id, available } = args as ToggleItemAvailabilityArgs;

  if (!id) {
    return { success: false, result: 'Item ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  const existing = await resolveItemByBusiness(id, ctx.businessId);
  if (!existing) {
    return { success: false, result: `Menu item "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  await prisma.menuItem.update({ where: { id }, data: { available } });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:item_toggle',
    resource: 'MenuItem',
    resourceId: id,
    details: { available, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `"${existing.name}" is now ${available ? 'available' : 'unavailable'} to customers.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface DeleteMenuItemArgs {
  id: string;
}

export async function handleManagerDeleteMenuItem(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id } = args as DeleteMenuItemArgs;

  if (!id) {
    return { success: false, result: 'Item ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  const existing = await resolveItemByBusiness(id, ctx.businessId);
  if (!existing) {
    return { success: false, result: `Menu item "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  await prisma.menuItem.delete({ where: { id } });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:item_delete',
    resource: 'MenuItem',
    resourceId: id,
    details: { name: existing.name, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Menu item "${existing.name}" (ID: ${id}) has been permanently deleted.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface CreateCategoryArgs {
  name: string;
  nameAr?: string;
  sortOrder?: number;
}

export async function handleManagerCreateCategory(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { name, nameAr, sortOrder } = args as CreateCategoryArgs;

  if (!name || !name.trim()) {
    return { success: false, result: 'Category name is required and cannot be empty.', errorCode: 'VALIDATION_ERROR' };
  }

  const category = await prisma.menuCategory.create({
    data: {
      businessId: ctx.businessId,
      name: name.trim(),
      nameAr: nameAr?.trim() ?? null,
      sortOrder: sortOrder ?? 0,
    },
    select: { id: true, name: true },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:category_create',
    resource: 'MenuCategory',
    resourceId: category.id,
    details: { name: category.name, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Category "${category.name}" created (ID: ${category.id}).`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface UpdateCategoryArgs {
  id: string;
  patch: {
    name?: string;
    nameAr?: string;
    sortOrder?: number;
  };
}

export async function handleManagerUpdateCategory(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id, patch } = args as UpdateCategoryArgs;

  if (!id) {
    return { success: false, result: 'Category ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  if (patch.name !== undefined && !patch.name.trim()) {
    return { success: false, result: 'name cannot be empty.', errorCode: 'VALIDATION_ERROR' };
  }

  const existing = await prisma.menuCategory.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return { success: false, result: `Category "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  const changed = Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined);
  if (changed.length === 0) {
    return { success: false, result: 'No patch fields provided.', errorCode: 'NO_OP' };
  }

  await prisma.menuCategory.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.nameAr !== undefined ? { nameAr: patch.nameAr } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
    },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:category_update',
    resource: 'MenuCategory',
    resourceId: id,
    details: { changed, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Category "${existing.name}" updated. Changed fields: ${changed.join(', ')}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface AddItemOptionArgs {
  itemId: string;
  name: string;
  price: number;
}

export async function handleManagerAddItemOption(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { itemId, name, price } = args as AddItemOptionArgs;

  if (!name || !name.trim()) {
    return { success: false, result: 'Option name is required.', errorCode: 'VALIDATION_ERROR' };
  }

  if (price < 0) {
    return { success: false, result: 'Option price must be >= 0.', errorCode: 'VALIDATION_ERROR' };
  }

  const item = await resolveItemByBusiness(itemId, ctx.businessId);
  if (!item) {
    return { success: false, result: `Menu item "${itemId}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  const option = await prisma.option.create({
    data: { itemId, name: name.trim(), price },
    select: { id: true, name: true },
  });

  // Ensure hasOptions is true
  await prisma.menuItem.update({ where: { id: itemId }, data: { hasOptions: true } });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:option_create',
    resource: 'Option',
    resourceId: option.id,
    details: { itemId, name: option.name, price, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Option "${option.name}" (price: ${price}) added to "${item.name}" (option ID: ${option.id}).`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface UpdateOptionArgs {
  id: string;
  patch: {
    name?: string;
    price?: number;
  };
}

export async function handleManagerUpdateOption(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id, patch } = args as UpdateOptionArgs;

  if (!id) {
    return { success: false, result: 'Option ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  if (patch.name !== undefined && !patch.name.trim()) {
    return { success: false, result: 'Option name cannot be empty.', errorCode: 'VALIDATION_ERROR' };
  }

  if (patch.price !== undefined && patch.price < 0) {
    return { success: false, result: 'Option price must be >= 0.', errorCode: 'VALIDATION_ERROR' };
  }

  // Verify option belongs to this business through the chain
  const option = await prisma.option.findFirst({
    where: { id, menuItem: { category: { businessId: ctx.businessId } } },
    select: { id: true, name: true },
  });

  if (!option) {
    return { success: false, result: `Option "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  const changed = Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined);
  if (changed.length === 0) {
    return { success: false, result: 'No patch fields provided.', errorCode: 'NO_OP' };
  }

  await prisma.option.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.price !== undefined ? { price: patch.price } : {}),
    },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:option_update',
    resource: 'Option',
    resourceId: id,
    details: { changed, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Option "${option.name}" updated. Changed fields: ${changed.join(', ')}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface DeleteOptionArgs {
  id: string;
}

export async function handleManagerDeleteOption(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id } = args as DeleteOptionArgs;

  if (!id) {
    return { success: false, result: 'Option ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  const option = await prisma.option.findFirst({
    where: { id, menuItem: { category: { businessId: ctx.businessId } } },
    select: { id: true, name: true, itemId: true },
  });

  if (!option) {
    return { success: false, result: `Option "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  await prisma.option.delete({ where: { id } });

  // Update hasOptions on the parent item if no options remain
  const remaining = await prisma.option.count({ where: { itemId: option.itemId } });
  if (remaining === 0) {
    await prisma.menuItem.update({ where: { id: option.itemId }, data: { hasOptions: false } });
  }

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:option_delete',
    resource: 'Option',
    resourceId: id,
    details: { name: option.name, itemId: option.itemId, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `Option "${option.name}" permanently deleted.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface FeatureItemArgs {
  id: string;
  on: boolean;
}

export async function handleManagerFeatureItem(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id, on } = args as FeatureItemArgs;

  if (!id) {
    return { success: false, result: 'Item ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  const item = await resolveItemByBusiness(id, ctx.businessId);
  if (!item) {
    return { success: false, result: `Menu item "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId: ctx.businessId },
    select: { id: true, featuredItems: true },
  });

  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  const current = parseJsonList(settings.featuredItems);
  const updated = on
    ? Array.from(new Set([...current, id]))
    : current.filter((itemId) => itemId !== id);

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: { featuredItems: JSON.stringify(updated) },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:feature_toggle',
    resource: 'MenuItem',
    resourceId: id,
    details: { featured: on, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `"${item.name}" is now ${on ? 'featured' : 'no longer featured'}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface HideItemArgs {
  id: string;
  on: boolean;
}

export async function handleManagerHideItem(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { id, on } = args as HideItemArgs;

  if (!id) {
    return { success: false, result: 'Item ID is required.', errorCode: 'VALIDATION_ERROR' };
  }

  const item = await resolveItemByBusiness(id, ctx.businessId);
  if (!item) {
    return { success: false, result: `Menu item "${id}" not found for this business.`, errorCode: 'NOT_FOUND' };
  }

  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId: ctx.businessId },
    select: { id: true, hiddenItems: true },
  });

  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  const current = parseJsonList(settings.hiddenItems);
  const updated = on
    ? Array.from(new Set([...current, id]))
    : current.filter((itemId) => itemId !== id);

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: { hiddenItems: JSON.stringify(updated) },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:menu:hide_toggle',
    resource: 'MenuItem',
    resourceId: id,
    details: { hidden: on, managerId: ctx.managerId },
  });

  return {
    success: true,
    result: `"${item.name}" is now ${on ? 'hidden from customers' : 'visible to customers again'}.`,
  };
}
