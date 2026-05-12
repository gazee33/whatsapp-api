import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { handleAddToCart } from '../add-to-cart.js';
import { handleUpdateCart } from '../update-cart.js';
import { resetDatabase, createTestFixture, prisma } from '../../../test/helpers.js';

describe('handleUpdateCart', () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  beforeAll(async () => {
    await resetDatabase();
    fixture = await createTestFixture();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestFixture();
  });

  async function addItem() {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.fries.id, quantity: 2 }],
    });
    return result.success ? (result.cartState!) : null;
  }

  async function addItemWithOption(optionId: string) {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.shawarmaChicken.id, quantity: 2, optionId }],
    });
    return result.success ? (result.cartState!) : null;
  }

  it('updates quantity of an existing cart item', async () => {
    const cart = await addItem();
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 5,
    });

    expect(result.success).toBe(true);
    expect(result.cartState!.items[0].quantity).toBe(5);
  });

  it('rejects invalid index', async () => {
    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 99,
      quantity: 3,
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
  });

  it('rejects empty cart', async () => {
    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 3,
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
  });

  it('rejects quantity less than 1', async () => {
    const cart = await addItem();
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 0,
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
  });

  it('changes option on an item', async () => {
    const cart = await addItemWithOption(fixture.options.largeOption.id);
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 2,
      optionId: fixture.options.smallOption.id,
    });

    expect(result.success).toBe(true);
    expect(result.cartState!.items[0].optionName).toBe('Small');
    expect(result.cartState!.items[0].optionId).toBe(fixture.options.smallOption.id);
  });

  it('updates notes on an item', async () => {
    const cart = await addItem();
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 2,
      notes: 'Without onions please',
    });

    expect(result.success).toBe(true);
    expect(result.cartState!.items[0].notes).toBe('Without onions please');
  });

  it('clears option when passing empty string', async () => {
    const cart = await addItemWithOption(fixture.options.largeOption.id);
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 2,
      optionId: '',
    });

    expect(result.success).toBe(false);
    expect(result.result).toContain('requires an option');
  });

  it('rejects invalid optionId on update', async () => {
    const cart = await addItemWithOption(fixture.options.largeOption.id);
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 2,
      optionId: 'nonexistent-option',
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
  });

  it('preserves notes if not provided', async () => {
    const cart = await addItem();
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 5,
    });

    expect(result.success).toBe(true);
    expect(result.cartState!.items[0].notes).toBeUndefined();
  });

  it('returns cart total in result message', async () => {
    const cart = await addItem();
    expect(cart).not.toBeNull();

    const result = await handleUpdateCart(fixture.business.id, fixture.customer.id, {
      index: 0,
      quantity: 3,
    });

    expect(result.success).toBe(true);
    expect(result.result).toContain('Cart total:');
  });
});
