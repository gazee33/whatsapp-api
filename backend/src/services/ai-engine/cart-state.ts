import { prisma } from '../../lib/prisma.js';

export type SupportedLanguage = 'ar' | 'en';

export type AgentMode =
  | 'browsing'
  | 'order_type_selection'
  | 'zone_selection'
  | 'address_entry'
  | 'cart_review'
  | 'awaiting_confirmation'
  | 'order_submitted';

export interface CartItem {
  menuItemId?: string;
  name: string;
  nameAr?: string | null;
  quantity: number;
  unitPrice: number;
  optionName?: string;
  optionPrice?: number;
  notes?: string;
}

export interface DeliveryInfo {
  zoneId: string;
  zoneName: string;
  address: string;
  notes?: string;
  fee: number;
  minimumOrder?: number;
  contactPhone?: string;
}

export interface CartState {
  mode: AgentMode;
  language?: SupportedLanguage;
  items: CartItem[];
  orderType?: 'delivery' | 'dine_in' | 'pickup';
  deliveryInfo?: DeliveryInfo;
  lastAssistantAskedForConfirmation?: boolean;
  updatedAt: string;
}

export function emptyCartState(): CartState {
  return {
    mode: 'browsing',
    items: [],
    lastAssistantAskedForConfirmation: false,
    updatedAt: new Date().toISOString(),
  };
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.unitPrice + (item.optionPrice || 0)) * item.quantity,
    0,
  );
}

export function formatCartForPrompt(cart: CartState, currency: string): string {
  if (cart.items.length === 0) {
    return 'Cart is empty.';
  }

  const lines = cart.items.map((item, index) => {
    const itemPrice = item.unitPrice + (item.optionPrice || 0);
    const lineTotal = itemPrice * item.quantity;
    const optionStr = item.optionName ? ` (${item.optionName})` : '';
    return `${index + 1}. ${item.quantity}x ${item.name}${optionStr} - ${lineTotal} ${currency}${item.notes ? ` - Notes: ${item.notes}` : ''}`;
  });

  const sections: string[] = [lines.join('\n')];

  if (cart.deliveryInfo) {
    sections.push(
      `\nDelivery info:\n  Zone: ${cart.deliveryInfo.zoneName}\n  Address: ${cart.deliveryInfo.address}${cart.deliveryInfo.notes ? `\n  Notes: ${cart.deliveryInfo.notes}` : ''}${cart.deliveryInfo.contactPhone ? `\n  Contact: ${cart.deliveryInfo.contactPhone}` : ''}\n  Fee: ${cart.deliveryInfo.fee} ${currency}${cart.deliveryInfo.minimumOrder ? ` (min: ${cart.deliveryInfo.minimumOrder} ${currency})` : ''}`,
    );
  }

  sections.push(`Total: ${calculateCartTotal(cart.items)} ${currency}`);
  sections.push(`Mode: ${cart.mode}`);
  if (cart.orderType) sections.push(`Order type: ${cart.orderType}`);
  sections.push(`Confirmation requested: ${cart.lastAssistantAskedForConfirmation ? 'yes' : 'no'}`);

  return sections.join('\n');
}

export async function getCartState(customerId: string): Promise<CartState> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  if (!customer?.cartState) {
    return emptyCartState();
  }

  try {
    const parsed = JSON.parse(customer.cartState) as Partial<CartState>;
    return {
      mode: parsed.mode ?? 'browsing',
      language: parsed.language,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      orderType: parsed.orderType,
      deliveryInfo: parsed.deliveryInfo,
      lastAssistantAskedForConfirmation: Boolean(parsed.lastAssistantAskedForConfirmation),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyCartState();
  }
}

export async function saveCartState(customerId: string, state: CartState): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      cartState: JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      }),
    },
  });
}
