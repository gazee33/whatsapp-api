import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { handleRequestConfirmation } from '../../src/tools/request-confirmation.js';
import { emptyCartState, saveCartState, getCartState } from '../../src/services/ai-engine/cart-state.js';
import type { CartState } from '../../src/services/ai-engine/cart-state.js';

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
});

describe('handleRequestConfirmation', () => {
  let customerId: string;

  beforeAll(async () => {
    const business = await testPrisma.business.create({
      data: {
        name: 'Test Restaurant CC',
        apiKey: 'test-cc-key',
        whatsappPhoneNumberId: 'test-cc-phone-id',
      },
    });
    const customer = await testPrisma.customer.create({
      data: {
        businessId: business.id,
        phone: '+966599999001',
        name: 'Test Customer CC',
      },
    });
    customerId = customer.id;
  });

  afterEach(async () => {
    if (!customerId) return;
    await testPrisma.customer.update({
      where: { id: customerId },
      data: { cartState: null },
    });
  });

  afterAll(async () => {
    if (!customerId) return;
    const cust = await testPrisma.customer.findUnique({ where: { id: customerId } });
    if (cust) {
      await testPrisma.business.delete({ where: { id: cust.businessId } }).catch(() => {});
    }
    await testPrisma.customer.deleteMany({ where: { id: customerId } });
    await testPrisma.$disconnect();
  });

  it('accepts empty cart (LLM manages items from context)', async () => {
    const cart: CartState = {
      ...emptyCartState(),
      language: 'en',
      orderType: 'pickup',
    };

    const result = await handleRequestConfirmation(customerId, cart);

    expect(result.success).toBe(true);
    expect(result.result).toContain('Confirmation mode set');
    expect(result.cartState.mode).toBe('awaiting_confirmation');
  });

  it('rejects already submitted order', async () => {
    const cart: CartState = {
      ...emptyCartState(),
      language: 'en',
      mode: 'order_submitted',
      items: [{ name: 'Shawarma', quantity: 1, unitPrice: 25 }],
    };

    const result = await handleRequestConfirmation(customerId, cart);

    expect(result.success).toBe(false);
    expect(result.result).toContain('already been submitted');
    expect(result.cartState.mode).toBe('order_submitted');
  });

  it('sets mode to awaiting_confirmation on success', async () => {
    const cart: CartState = {
      ...emptyCartState(),
      language: 'en',
      orderType: 'delivery',
      items: [{ name: 'Shawarma', quantity: 2, unitPrice: 25 }],
    };

    const result = await handleRequestConfirmation(customerId, cart);

    expect(result.success).toBe(true);
    expect(result.result).toContain('Confirmation mode set');
    expect(result.result).toContain('2x Shawarma');
    expect(result.cartState.mode).toBe('awaiting_confirmation');
  });

  it('persists to database', async () => {
    const cart: CartState = {
      ...emptyCartState(),
      language: 'ar',
      orderType: 'pickup',
      items: [{ name: 'شاورما', quantity: 1, unitPrice: 25 }],
    };

    await saveCartState(customerId, cart);
    const result = await handleRequestConfirmation(customerId, cart);

    expect(result.success).toBe(true);

    const saved = await getCartState(customerId);
    expect(saved.mode).toBe('awaiting_confirmation');
    expect(saved.language).toBe('ar');
    expect(saved.orderType).toBe('pickup');
    expect(saved.items).toHaveLength(1);
  });

  it('rejects if orderType is missing', async () => {
    const cart: CartState = {
      ...emptyCartState(),
      language: 'en',
      items: [{ name: 'Shawarma', quantity: 1, unitPrice: 25 }],
    };

    const result = await handleRequestConfirmation(customerId, cart);

    expect(result.success).toBe(false);
    expect(result.result).toContain('Order type is required');
    expect(result.cartState.mode).toBe('browsing');
  });

  it('preserves delivery location info and order type', async () => {
    const cart: CartState = {
      ...emptyCartState(),
      language: 'en',
      orderType: 'delivery',
      deliveryLocation: {
        latitude: 24.6748,
        longitude: 46.6918,
        address: '123 Main St, Riyadh',
        googleAddress: '123 Main St, Riyadh, Saudi Arabia',
        distanceKm: 4.2,
        durationMin: 12,
        fee: 10,
      },
      items: [{ name: 'Shawarma', quantity: 1, unitPrice: 25 }],
    };

    const result = await handleRequestConfirmation(customerId, cart);

    expect(result.success).toBe(true);
    expect(result.cartState.mode).toBe('awaiting_confirmation');
    expect(result.cartState.orderType).toBe('delivery');
    expect(result.cartState.deliveryLocation?.address).toBe('123 Main St, Riyadh');
    expect(result.cartState.deliveryLocation?.distanceKm).toBe(4.2);
    expect(result.cartState.deliveryLocation?.fee).toBe(10);
  });

  it('summarises up to 3 items and mentions extras', async () => {
    const cart: CartState = {
      ...emptyCartState(),
      language: 'en',
      orderType: 'dine_in',
      items: [
        { name: 'Shawarma', quantity: 1, unitPrice: 25 },
        { name: 'Fries', quantity: 2, unitPrice: 10 },
        { name: 'Cola', quantity: 1, unitPrice: 5 },
        { name: 'Water', quantity: 1, unitPrice: 2 },
      ],
    };

    const result = await handleRequestConfirmation(customerId, cart);

    expect(result.result).toContain('4 item(s)');
    expect(result.result).toContain('and 1 more item(s)');
  });
});
