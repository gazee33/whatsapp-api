import type { ToolDefinition } from '../../llm/types.js';
import type { ManagerToolContext, ManagerToolResult } from './index.js';

export const managerHelpDefinition: ToolDefinition = {
  name: 'manager_help',
  description: 'Returns a summary of all capabilities available to the manager. Call this when the manager asks "what can you do?" or seems unsure about what to ask.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleManagerHelp(_args: unknown, _ctx: ManagerToolContext): Promise<ManagerToolResult> {
  return {
    success: true,
    result: `Here's what I can help you with:

**AI Rules** — tune how the customer-facing agent behaves
  • manager_get_ai_rules, manager_update_ai_rules

**Menu** — add, edit, delete items, categories, and options
  • manager_list_menu_items, manager_create_menu_item, manager_update_menu_item
  • manager_toggle_item_availability, manager_delete_menu_item
  • manager_create_category, manager_update_category
  • manager_add_item_option, manager_update_option, manager_delete_option
  • manager_feature_item, manager_hide_item

**Settings** — hours, address, delivery toggles, payment methods, and more
  • manager_get_restaurant_settings, manager_update_restaurant_settings
  • manager_set_temporarily_closed, manager_update_weekly_schedule
  • manager_add_closure_exception, manager_update_address

**Orders** — view and update live orders
  • manager_list_orders, manager_get_order, manager_update_order_status

Just describe what you'd like to do and I'll handle it!`,
  };
}
