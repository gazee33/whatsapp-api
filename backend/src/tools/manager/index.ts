import type { ToolCall, ToolDefinition } from '../../llm/types.js';
import type { Business, Manager, RestaurantSettings } from '@prisma/client';
import { managerHelpDefinition, handleManagerHelp } from './help.js';
import {
  managerGetAiRulesDefinition,
  managerUpdateAiRulesDefinition,
  handleManagerGetAiRules,
  handleManagerUpdateAiRules,
} from './ai-rules.js';
import { managerConfirmDefinition, handleManagerConfirm } from './confirm.js';
import {
  managerListMenuItemsDefinition,
  managerCreateMenuItemDefinition,
  managerUpdateMenuItemDefinition,
  managerToggleItemAvailabilityDefinition,
  managerDeleteMenuItemDefinition,
  managerCreateCategoryDefinition,
  managerUpdateCategoryDefinition,
  managerAddItemOptionDefinition,
  managerUpdateOptionDefinition,
  managerDeleteOptionDefinition,
  managerFeatureItemDefinition,
  managerHideItemDefinition,
  handleManagerListMenuItems,
  handleManagerCreateMenuItem,
  handleManagerUpdateMenuItem,
  handleManagerToggleItemAvailability,
  handleManagerDeleteMenuItem,
  handleManagerCreateCategory,
  handleManagerUpdateCategory,
  handleManagerAddItemOption,
  handleManagerUpdateOption,
  handleManagerDeleteOption,
  handleManagerFeatureItem,
  handleManagerHideItem,
} from './menu.js';
import {
  managerGetRestaurantSettingsDefinition,
  managerUpdateRestaurantSettingsDefinition,
  managerSetTemporarilyClosedDefinition,
  managerUpdateWeeklyScheduleDefinition,
  managerAddClosureExceptionDefinition,
  managerUpdateAddressDefinition,
  handleManagerGetRestaurantSettings,
  handleManagerUpdateRestaurantSettings,
  handleManagerSetTemporarilyClosed,
  handleManagerUpdateWeeklySchedule,
  handleManagerAddClosureException,
  handleManagerUpdateAddress,
} from './settings.js';
import {
  managerListOrdersDefinition,
  managerGetOrderDefinition,
  managerUpdateOrderStatusDefinition,
  handleManagerListOrders,
  handleManagerGetOrder,
  handleManagerUpdateOrderStatus,
} from './orders.js';

export type BusinessWithSettings = Business & { settings: RestaurantSettings | null };

export interface ManagerToolContext {
  businessId: string;
  managerId: string;
  managerPhone: string;
  business: BusinessWithSettings;
  manager: Manager;
}

export interface ManagerToolResult {
  success: boolean;
  result: string;
  errorCode?: string;
  /** Set to true when the tool itself sent a WhatsApp message (e.g. manager_confirm). */
  didSendMessage?: boolean;
}

// ── Registry ──────────────────────────────────────────────────────────────────
export const MANAGER_TOOL_DEFINITIONS: ToolDefinition[] = [
  managerHelpDefinition,
  managerConfirmDefinition,
  // AI rules
  managerGetAiRulesDefinition,
  managerUpdateAiRulesDefinition,
  // Menu
  managerListMenuItemsDefinition,
  managerCreateMenuItemDefinition,
  managerUpdateMenuItemDefinition,
  managerToggleItemAvailabilityDefinition,
  managerDeleteMenuItemDefinition,
  managerCreateCategoryDefinition,
  managerUpdateCategoryDefinition,
  managerAddItemOptionDefinition,
  managerUpdateOptionDefinition,
  managerDeleteOptionDefinition,
  managerFeatureItemDefinition,
  managerHideItemDefinition,
  // Settings
  managerGetRestaurantSettingsDefinition,
  managerUpdateRestaurantSettingsDefinition,
  managerSetTemporarilyClosedDefinition,
  managerUpdateWeeklyScheduleDefinition,
  managerAddClosureExceptionDefinition,
  managerUpdateAddressDefinition,
  // Orders
  managerListOrdersDefinition,
  managerGetOrderDefinition,
  managerUpdateOrderStatusDefinition,
];

// ── Executor ──────────────────────────────────────────────────────────────────

function normalizeArgs<T>(args: unknown): T {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args) as T;
    } catch {
      throw new Error(`Invalid tool arguments: ${(args as string).substring(0, 200)}`);
    }
  }
  return (args ?? {}) as T;
}

export async function executeManagerTool(
  toolCall: ToolCall,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  switch (toolCall.name) {
    case 'manager_help':
      return handleManagerHelp(normalizeArgs(toolCall.arguments), ctx);

    case 'manager_confirm':
      return handleManagerConfirm(normalizeArgs(toolCall.arguments), ctx);

    // AI rules
    case 'manager_get_ai_rules':
      return handleManagerGetAiRules(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_ai_rules':
      return handleManagerUpdateAiRules(normalizeArgs(toolCall.arguments), ctx);

    // Menu
    case 'manager_list_menu_items':
      return handleManagerListMenuItems(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_create_menu_item':
      return handleManagerCreateMenuItem(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_menu_item':
      return handleManagerUpdateMenuItem(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_toggle_item_availability':
      return handleManagerToggleItemAvailability(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_delete_menu_item':
      return handleManagerDeleteMenuItem(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_create_category':
      return handleManagerCreateCategory(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_category':
      return handleManagerUpdateCategory(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_add_item_option':
      return handleManagerAddItemOption(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_option':
      return handleManagerUpdateOption(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_delete_option':
      return handleManagerDeleteOption(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_feature_item':
      return handleManagerFeatureItem(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_hide_item':
      return handleManagerHideItem(normalizeArgs(toolCall.arguments), ctx);

    // Settings
    case 'manager_get_restaurant_settings':
      return handleManagerGetRestaurantSettings(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_restaurant_settings':
      return handleManagerUpdateRestaurantSettings(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_set_temporarily_closed':
      return handleManagerSetTemporarilyClosed(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_weekly_schedule':
      return handleManagerUpdateWeeklySchedule(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_add_closure_exception':
      return handleManagerAddClosureException(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_address':
      return handleManagerUpdateAddress(normalizeArgs(toolCall.arguments), ctx);

    // Orders
    case 'manager_list_orders':
      return handleManagerListOrders(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_get_order':
      return handleManagerGetOrder(normalizeArgs(toolCall.arguments), ctx);
    case 'manager_update_order_status':
      return handleManagerUpdateOrderStatus(normalizeArgs(toolCall.arguments), ctx);

    default:
      return {
        success: false,
        result: `Tool "${toolCall.name}" is not yet available.`,
        errorCode: 'NOT_IMPLEMENTED',
      };
  }
}
