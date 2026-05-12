import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { handleAddToCart } from '../add-to-cart.js';
import { resetDatabase, createTestFixture, prisma } from '../../../test/helpers.js';

describe('handleAddToCart', () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  beforeAll(async () => {
    await resetDatabase();
    fixture = await createTestFixture();
  });

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestFixture();
  });

  it('adds a single item to cart', async () => {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.fries.id, quantity: 2 }],
    });

    expect(result.success).toBe(true);
    expect(result.cartState).not.toBeNull();
    const cart = result.cartState!;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].menuItemId).toBe(fixture.menuItems.fries.id);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.items[0].name).toBe('French Fries');
    expect(cart.items[0].cartItemId).toBeTruthy();
    expect(result.result).toContain('Added to cart');
  });

  it('adds multiple items at once', async () => {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [
        { itemId: fixture.menuItems.shawarmaChicken.id, quantity: 2, optionId: fixture.options.largeOption.id },
        { itemId: fixture.menuItems.fries.id, quantity: 1 },
        { itemId: fixture.menuItems.cola.id, quantity: 3 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.cartState!.items).toHaveLength(3);
    expect(result.result).toContain('Cart total:');
  });

  it('adds item with valid option', async () => {
    const largeOpt = fixture.options.largeOption;

    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{
        itemId: fixture.menuItems.shawarmaChicken.id,
        quantity: 1,
        optionId: largeOpt.id,
      }],
    });

    expect(result.success).toBe(true);
    const item = result.cartState!.items[0];
    expect(item.optionName).toBe('Large');
    expect(item.optionId).toBe(largeOpt.id);
    expect(item.unitPrice).toBe(fixture.menuItems.shawarmaChicken.basePrice);
  });

  it('rejects invalid itemId', async () => {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: 'nonexistent-id', quantity: 1 }],
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
  });

  it('rejects item from different business', async () => {
    const otherBusiness = await prisma.business.create({
      data: { name: 'Other', apiKey: `other-${Date.now()}` },
    });

    const result = await handleAddToCart(otherBusiness.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.shawarmaChicken.id, quantity: 1 }],
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
  });

  it('rejects invalid optionId', async () => {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{
        itemId: fixture.menuItems.shawarmaChicken.id,
        quantity: 1,
        optionId: 'bad-option-id',
      }],
    });

    expect(result.success).toBe(false);
    expect(result.cartState).toBeNull();
  });

  it('rejects item with no option when options are required', async () => {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.shawarmaChicken.id, quantity: 1 }],
    });

    expect(result.success).toBe(false);
    expect(result.result).toContain('requires an option');
  });

  it('adds item without option when item has no options', async () => {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.fries.id, quantity: 2 }],
    });

    expect(result.success).toBe(true);
    expect(result.cartState!.items).toHaveLength(1);
  });

  it('appends to existing cart items (no merge)', async () => {
    await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.fries.id, quantity: 2 }],
    });

    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.fries.id, quantity: 2 }],
    });

    expect(result.success).toBe(true);
    expect(result.cartState!.items).toHaveLength(2);
    expect(result.result).toContain('Cart total:');
  });

  it('rejects empty items array', async () => {
    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [],
    });

    expect(result.success).toBe(false);
    expect(result.result).toContain('No items provided');
  });

  it('rejects unavailable item', async () => {
    await prisma.menuItem.update({
      where: { id: fixture.menuItems.fries.id },
      data: { available: false },
    });

    const result = await handleAddToCart(fixture.business.id, fixture.customer.id, {
      items: [{ itemId: fixture.menuItems.fries.id, quantity: 1 }],
    });

    expect(result.success).toBe(false);
    expect(result.result).toContain('unavailable');
  });
});
