import { prisma } from '../lib/prisma.js';

export interface SetDeliveryAddressParams {
  zoneName: string;
  address: string;
  notes?: string;
  contactPhone?: string;
}

export async function handleSetDeliveryAddress(
  businessId: string,
  customerId: string,
  params: SetDeliveryAddressParams
): Promise<string> {
  const { zoneName, address, notes, contactPhone } = params;

  if (!zoneName || !address) {
    return 'Please provide both a delivery zone name and your full address.';
  }

  const zone = await prisma.deliveryZone.findFirst({
    where: {
      businessId,
      name: { equals: zoneName },
      isActive: true,
    },
  });

  if (!zone) {
    return `Delivery zone "${zoneName}" not found. Please check available zones using query_zones.`;
  }

  // Save delivery info to cart state so it persists between messages
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  let cartState: any = { mode: 'browsing', items: [], updatedAt: new Date().toISOString() };
  if (customer?.cartState) {
    try {
      cartState = JSON.parse(customer.cartState);
    } catch {}
  }

  cartState.orderType = 'delivery';
  cartState.deliveryInfo = {
    zoneId: zone.id,
    zoneName: zone.name,
    fee: zone.deliveryFee,
    minimumOrder: zone.minimumOrder || undefined,
    address,
    notes: notes || '',
    contactPhone: contactPhone || '',
  };
  cartState.mode = 'browsing';
  cartState.updatedAt = new Date().toISOString();

  await prisma.customer.update({
    where: { id: customerId },
    data: { cartState: JSON.stringify(cartState) },
  });

  const result = `Delivery details saved:
📮 Zone: ${zone.name}
📍 Address: ${address}${notes ? `\n📝 Notes: ${notes}` : ''}${contactPhone ? `\n📞 Contact: ${contactPhone}` : ''}
💰 Delivery fee: ${zone.deliveryFee.toFixed(2)}${zone.minimumOrder ? ` (minimum order: ${zone.minimumOrder.toFixed(2)})` : ''}

Now let me know what you'd like to order!`;

  return result;
}
