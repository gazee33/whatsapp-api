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
    name: 'check_restaurant_info',
    description: 'Get restaurant information like address, hours, payment methods, delivery info. Use when customer asks "where are you?", "are you open?", "what payments do you accept?", "how much is delivery?".',
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
    description: 'Save the customer delivery address and resolve location using Google Maps. When the customer shares a WhatsApp location (coordinates provided), pass latitude and longitude. When the customer types an address, pass the address text. This tool will reverse-geocode coordinates, forward-geocode text addresses, calculate distance from the restaurant, and determine the delivery fee.',
    parameters: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'Latitude from WhatsApp location share (optional, use with longitude)' },
        longitude: { type: 'number', description: 'Longitude from WhatsApp location share (optional, use with latitude)' },
        address: { type: 'string', description: 'Full delivery address text (optional, use when customer types instead of sharing location)' },
        notes: { type: 'string', description: 'Delivery instructions like gate code, landmark (optional)' },
        contactPhone: { type: 'string', description: 'Phone number for delivery driver (optional)' }
      },
      required: []
    }
  },
  {
    name: 'request_confirmation',
    description: 'Request explicit customer confirmation before submitting an order. Call this when the customer has finished adding items and indicates they are ready to order. You MUST provide the orderType — if you don\'t know it yet, ask the customer first. This will save the order type and put the cart in awaiting_confirmation mode. After the customer confirms, call submit_order.',
    parameters: {
      type: 'object',
      properties: {
        orderType: {
          type: 'string',
          enum: ['delivery', 'dine_in', 'pickup'],
          description: 'Order type: delivery, dine_in, or pickup. REQUIRED — ask the customer if not yet known.'
        }
      },
      required: ['orderType']
    }
  },
  {
    name: 'submit_order',
    description: 'Create a new order with items. Use when customer confirms they want to order. Extract items from conversation history — include name and quantity for each item. If the item has options (shown after "Options:" in query_menu results), you MUST include optionName. If the item has NO options, do NOT include optionName.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'List of items to order. Each item must include name and quantity. If the item has options (shown in menu results), you MUST include optionName.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the menu item' },
              quantity: { type: 'number', description: 'How many of this item' },
              optionName: { type: 'string', description: 'The selected option name (e.g. "Large", "3 سيخ"). REQUIRED if item has options, otherwise omit.' },
              notes: { type: 'string', description: 'Special instructions (optional)' },
              totalPrice: { type: 'number', description: 'Total price of the item (item base price + option price) * quantity.' }
            },
            required: ['name', 'quantity', 'totalPrice']
          }
        },
        orderNotes: { type: 'string', description: 'Order notes (optional)' },
        orderType: { type: 'string', enum: ['delivery', 'dine_in', 'pickup'], description: 'Order type (optional — already saved from request_confirmation step).' },
        deliveryAddress: { type: 'string', description: 'Full delivery address. REQUIRED if orderType is delivery.' },
        deliveryNotes: { type: 'string', description: 'Delivery instructions like gate code (optional)' },
        contactPhone: { type: 'string', description: 'Contact number for delivery driver (optional)' }
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
