import { ToolDefinition } from '../llm/types.js';

export const tools: ToolDefinition[] = [
  
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
    name: 'add_to_cart',
    description: 'Add items to the cart. Use when customer selects items from the menu. Can add multiple items at once. Shows the current cart total after adding.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Items to add to the cart',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: 'ID of the menu item from query_menu results' },
              quantity: { type: 'number', description: 'How many of this item' },
              optionId: { type: 'string', description: 'ID of the selected option from query_menu results. REQUIRED if item has options, otherwise omit.' },
              notes: { type: 'string', description: 'Special instructions (optional)' },
            },
            required: ['itemId', 'quantity']
          }
        }
      },
      required: ['items']
    }
  },
  {
    name: 'update_cart',
    description: 'Update a cart item at a specific index. Use when customer wants to change quantity, option, or notes of an existing cart item. The index is shown in [brackets] in CURRENT CART (0-based). Provide the FULL updated values for the item — the tool overwrites the entry completely.',
    parameters: {
      type: 'object',
      properties: {
        index: { type: 'number', description: '0-based index of the cart item to update (shown as [N] in CURRENT CART)' },
        quantity: { type: 'number', description: 'New quantity for this item (must be at least 1)' },
        optionId: { type: 'string', description: 'ID of the new option. Omit to keep current. Pass empty string to remove option (only if item has no options).' },
        notes: { type: 'string', description: 'New special instructions. Omit to keep current. Pass empty string to clear.' },
      },
      required: ['index', 'quantity']
    }
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the cart at a specific index. Use when customer says "remove", "delete", "cancel", "take out", or wants to drop an item. The index is shown in [brackets] in CURRENT CART (0-based).',
    parameters: {
      type: 'object',
      properties: {
        index: { type: 'number', description: '0-based index of the cart item to remove (shown as [N] in CURRENT CART)' },
      },
      required: ['index']
    }
  },
  {
    name: 'submit_order',
    description: 'Create a new order with items from the cart. Call this only when the customer explicitly says yes to "shall I place the order?". REQUIRED: customer must confirm verbally first. The order type, delivery address, and contact phone will be auto-filled from cart state — you can override them if needed.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'OPTIONAL — items will be auto-filled from the cart if omitted. Override only if you need to adjust before submitting.',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: 'ID of the menu item' },
              quantity: { type: 'number', description: 'How many of this item' },
              optionName: { type: 'string', description: 'Option name' },
              notes: { type: 'string', description: 'Special instructions' },
            },
            required: ['itemId', 'quantity']
          }
        },
        orderType: { type: 'string', enum: ['delivery', 'dine_in', 'pickup'], description: 'OPTIONAL — auto-filled from cart if omitted. Override only if customer changes their mind.' },
        deliveryAddress: { type: 'string', description: 'OPTIONAL — auto-filled from cart if omitted.' },
        deliveryNotes: { type: 'string', description: 'Delivery instructions like gate code (optional)' },
        contactPhone: { type: 'string', description: 'OPTIONAL — auto-filled from customer phone if omitted.' }
      },
      required: []
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
  },
  {
    name: 'flag_customer',
    description: 'Flag this customer for human support. Use when: the customer is angry, frustrated, or explicitly asks to speak to a human; the issue is too complex for the AI (billing disputes, unresolved refunds, safety concerns); or the AI has exhausted its ability to help. Once flagged, the AI will stop responding to this customer — all future messages go to human agents. Call this and then tell the customer a support agent will follow up shortly.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Brief reason this customer needs human support (e.g., "customer frustrated with delivery delay", "customer asked to speak to a manager", "complex billing dispute the AI cannot resolve")' }
      },
      required: ['reason']
    }
  }
];
