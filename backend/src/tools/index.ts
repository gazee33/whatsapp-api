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
    name: 'submit_order',
    description: 'Create a new order with items. Use when customer confirms they want to order. Extract items from conversation history — include name (use exact menu names from query_menu results) and quantity for each item. Always include quantity for each item.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'List of items to order',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the menu item' },
              quantity: { type: 'number', description: 'How many of this item' },
              notes: { type: 'string', description: 'Special instructions (optional)' }
            },
            required: ['name', 'quantity']
          }
        },
        orderNotes: { type: 'string', description: 'Order notes (optional)' }
      },
      required: ['items']
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
