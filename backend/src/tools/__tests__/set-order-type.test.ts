import { describe, it, expect, beforeEach } from 'vitest';
import { handleSetOrderType } from '../set-order-type.js';
import { getCartState, saveCartState, emptyCartState } from '../../services/ai-engine/cart-state.js';
import { resetDatabase, createTestFixture, prisma } from '../../../test/helpers.js';

describe('handleSetOrderType', () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestFixture();
  });

  it('persists pickup to the cart', async () => {
    const { business, customer } = fixture;

    const result = await handleSetOrderType(business.id, customer.id, {
      orderType: 'pickup',
    });

    expect(result.success).toBe(true);
    expect(result.cartState).not.toBeNull();
    expect(result.cartState!.orderType).toBe('pickup');

    const persisted = await getCartState(customer.id);
    expect(persisted.orderType).toBe('pickup');
  });

  it('persists dine_in to the cart', async () => {
    const { business, customer } = fixture;

    const result = await handleSetOrderType(business.id, customer.id, {
      orderType: 'dine_in',
    });

    expect(result.success).toBe(true);
    const persisted = await getCartState(customer.id);
    expect(persisted.orderType).toBe('dine_in');
  });

  it('rejects pickup when pickupEnabled is false', async () => {
    const { business, customer } = fixture;
    await prisma.restaurantSettings.update({
      where: { businessId: business.id },
      data: { pickupEnabled: false },
    });

    const result = await handleSetOrderType(business.id, customer.id, {
      orderType: 'pickup',
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
    const persisted = await getCartState(customer.id);
    expect(persisted.orderType).toBeUndefined();
  });

  it('rejects dine_in when dineInEnabled is false', async () => {
    const { business, customer } = fixture;
    await prisma.restaurantSettings.update({
      where: { businessId: business.id },
      data: { dineInEnabled: false },
    });

    const result = await handleSetOrderType(business.id, customer.id, {
      orderType: 'dine_in',
    });

    expect(result.success).toBe(false);
    const persisted = await getCartState(customer.id);
    expect(persisted.orderType).toBeUndefined();
  });

  it('rejects invalid order type', async () => {
    const { business, customer } = fixture;

    const result = await handleSetOrderType(business.id, customer.id, {
      orderType: 'delivery' as any,
    });

    expect(result.success).toBe(false);
    expect(result.result).toMatch(/set_delivery_address/);
  });

  it('clears stale deliveryLocation when switching to pickup', async () => {
    const { business, customer } = fixture;

    const seed = emptyCartState();
    seed.orderType = 'delivery';
    seed.deliveryLocation = {
      latitude: 24.7,
      longitude: 46.6,
      address: 'Old address',
      googleAddress: 'Old address',
      distanceKm: 5,
      durationMin: 10,
      fee: 10,
    } as any;
    await saveCartState(customer.id, seed);

    const result = await handleSetOrderType(business.id, customer.id, {
      orderType: 'pickup',
    });

    expect(result.success).toBe(true);
    const persisted = await getCartState(customer.id);
    expect(persisted.orderType).toBe('pickup');
    expect(persisted.deliveryLocation).toBeUndefined();
  });
});
