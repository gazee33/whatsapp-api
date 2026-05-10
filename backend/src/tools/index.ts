import { ToolDefinition } from '../llm/types.js';

export const tools: ToolDefinition[] = [
  {
    name: 'query_menu',
    description: 'Search menu items by keyword or category. Use when customer asks "what do you have?" or wants to browse the menu.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword (optional)' },
        category: { type: 'string', description: 'Category name (optional)' }
      },
      required: []
    }
  },
  {
    name: 'query_zones',
    description: 'List all available delivery zones with fees and minimum orders. Use when customer wants delivery and asks "do you deliver to my area?" or "what are the delivery zones?".',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Zone name filter (optional)' }
      },
      required: []
    }
  },
  {
    name: 'check_restaurant_info',
    description: 'Get restaurant information like address, hours, payment methods, delivery zones. Use when customer asks "where are you?", "are you open?", "what payments do you accept?".',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['address', 'hours', 'payment', 'delivery', 'all'],
          description: 'Topic to look up (optional, returns all if omitted)'
        }
      },
      required: []
    }
  },
  {
    name: 'set_delivery_address',
    description: 'Save the customer delivery address and selected zone for a delivery order. Use AFTER query_zones — when the customer has chosen a zone and provided their full address.',
    parameters: {
      type: 'object',
      properties: {
        zoneName: { type: 'string', description: 'The delivery zone name the customer chose (e.g. "Al-Malaz")' },
        address: { type: 'string', description: 'The full delivery address (street, building, apartment)' },
        notes: { type: 'string', description: 'Delivery instructions like gate code, landmark (optional)' },
        contactPhone: { type: 'string', description: 'Phone number for delivery driver (optional)' }
      },
      required: ['zoneName', 'address']
    }
  },
  {
    name: 'submit_order',
    description: 'Create a new order with items. Use when customer confirms they want to order. Extract items from conversation history — include name (use exact menu names from query_menu results) and quantity for each item. If the item has options (shown after "Options:" in query_menu results), you MUST include optionName. If the item has NO options, do NOT include optionName.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'List of items to order. Each item must include name and quantity. If the item has options (shown in menu results), you MUST include optionName.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the menu item (exact match from query_menu)' },
              quantity: { type: 'number', description: 'How many of this item' },
              optionName: { type: 'string', description: 'The selected option name (e.g. "Large", "3 سيخ"). REQUIRED if item has options, otherwise omit.' },
              notes: { type: 'string', description: 'Special instructions (optional)' }
            },
            required: ['name', 'quantity']
          }
        },
        orderNotes: { type: 'string', description: 'Order notes (optional)' },
        orderType: { type: 'string', enum: ['delivery', 'dine_in', 'pickup'], description: 'Order type: delivery, dine_in, or pickup. REQUIRED.' },
        deliveryAddress: { type: 'string', description: 'Full delivery address. REQUIRED if orderType is delivery.' },
        deliveryNotes: { type: 'string', description: 'Delivery instructions like gate code (optional)' },
        deliveryZoneId: { type: 'string', description: 'Delivery zone ID from set_delivery_address result (optional)' },
        contactPhone: { type: 'string', description: 'Contact number for delivery driver (optional)' }
      },
      required: ['items', 'orderType']
    }
  },
  {
    name: 'check_order_status',
    description: 'Check the status of an existing order. Use when customer asks "where is my order?" or "is my order ready?".',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order ID (optional, finds latest if not provided)' }
      },
      required: []
    }
  },
  {
    name: 'file_complaint',
    description: 'Log a complaint about an order or experience. Use when customer reports a problem.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Complaint description' }
      },
      required: ['content']
    }
  }
];
