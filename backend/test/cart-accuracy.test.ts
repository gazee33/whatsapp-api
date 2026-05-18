import { describe, it, expect, beforeEach } from 'vitest';
import { handleAddToCart } from '../src/tools/add-to-cart.js';
import { getCartState } from '../src/services/ai-engine/cart-state.js';
import { resetDatabase, createTestFixture } from './helpers.js';

describe('Cart accuracy — failed add_to_cart must not corrupt displayed cart', () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestFixture();
  });

  it('returns success:false when optionId is missing for an option-required item', async () => {
    const { business, customer, menuItems } = fixture;

    const result = await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.shawarmaChicken.id, quantity: 1 }],
    });

    expect(result.success).toBe(false);
  });

  it('error message lists available options so the LLM can retry with the right id', async () => {
    const { business, customer, menuItems, options } = fixture;

    const result = await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.shawarmaChicken.id, quantity: 1 }],
    });

    expect(result.success).toBe(false);
    expect(result.result).toContain('Large');
    expect(result.result).toContain('Medium');
    expect(result.result).toContain('Small');
    expect(result.result).toContain(options.largeOption.id);
    expect(result.result).toContain('was NOT added');
  });

  it('returns real DB cart on failure so the system prompt refreshes accurately', async () => {
    const { business, customer, menuItems } = fixture;

    // Add a no-option item first (fries)
    await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.fries.id, quantity: 1 }],
    });

    // Attempt to add an option-required item without an optionId
    const result = await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.shawarmaChicken.id, quantity: 1 }],
    });

    expect(result.success).toBe(false);
    // cartState returned must be the real DB cart (fries is there, shawarma is not)
    expect(result.cartState).not.toBeNull();
    expect(result.cartState!.items).toHaveLength(1);
    expect(result.cartState!.items[0].menuItemId).toBe(menuItems.fries.id);
  });

  it('DB cart is unchanged after a failed add', async () => {
    const { business, customer, menuItems } = fixture;

    await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.fries.id, quantity: 1 }],
    });

    // Fail to add option-required item
    await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.shawarmaChicken.id, quantity: 1 }],
    });

    // DB cart must still only have fries
    const dbCart = await getCartState(customer.id);
    expect(dbCart.items).toHaveLength(1);
    expect(dbCart.items[0].menuItemId).toBe(menuItems.fries.id);
  });

  it('a subsequent successful add sees all previous items — not just the newly added one', async () => {
    const { business, customer, menuItems, options } = fixture;

    // Add fries (no options)
    await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.fries.id, quantity: 1 }],
    });

    // Fail shawarma (no optionId provided)
    await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.shawarmaChicken.id, quantity: 1 }],
    });

    // Add cola (no options) — this is the "cheese pies" moment in the real conversation
    const colResult = await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.cola.id, quantity: 1 }],
    });

    expect(colResult.success).toBe(true);

    // Returned cart must contain BOTH fries and cola — shawarma was never really added
    const ids = colResult.cartState.items.map(i => i.menuItemId);
    expect(ids).toContain(menuItems.fries.id);
    expect(ids).toContain(menuItems.cola.id);
    expect(ids).not.toContain(menuItems.shawarmaChicken.id);
    expect(colResult.cartState.items).toHaveLength(2);

    // Sanity: DB cart matches returned cart
    const dbCart = await getCartState(customer.id);
    expect(dbCart.items).toHaveLength(2);
  });

  it('successful add with valid optionId works and shows the option name', async () => {
    const { business, customer, menuItems, options } = fixture;

    const result = await handleAddToCart(business.id, customer.id, {
      items: [{ itemId: menuItems.shawarmaChicken.id, quantity: 1, optionId: options.largeOption.id }],
    });

    expect(result.success).toBe(true);
    expect(result.cartState.items).toHaveLength(1);
    expect(result.cartState.items[0].optionName).toBe('Large');
    expect(result.cartState.items[0].optionPrice).toBe(5);
  });
});
