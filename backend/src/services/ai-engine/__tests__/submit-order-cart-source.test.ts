import { describe, it, expect, beforeEach } from 'vitest';
import { executeTool } from '../tool-executor.js';
import { handleAddToCart } from '../../../tools/add-to-cart.js';
import { getCartState } from '../cart-state.js';
import { resetDatabase, createTestFixture, prisma } from '../../../../test/helpers.js';

describe('submit_order — cart is the source of truth', () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestFixture();
  });

  async function seedCart() {
    const { business, customer, menuItems, options } = fixture;

    await handleAddToCart(business.id, customer.id, {
      items: [
        { itemId: menuItems.shawarmaChicken.id, quantity: 1, optionId: options.largeOption.id },
        { itemId: menuItems.fries.id, quantity: 1 },
        { itemId: menuItems.cola.id, quantity: 3 },
      ],
    });

    const cart = await getCartState(customer.id);
    expect(cart.items).toHaveLength(3);
    return cart;
  }

  it('uses the persisted cart even when the LLM passes a truncated items list', async () => {
    const cart = await seedCart();
    const { business, customer, menuItems } = fixture;

    const result = await executeTool({
      toolCall: {
        name: 'submit_order',
        arguments: {
          items: [{ itemId: menuItems.fries.id, quantity: 1 }],
          orderType: 'pickup',
        },
      } as any,
      businessId: business.id,
      customerId: customer.id,
      cartState: cart,
    });

    expect(result.success).toBe(true);
    expect(result.createdOrderId).toMatch(/^ORD-/);

    const orders = await prisma.order.findMany({
      where: { businessId: business.id },
      include: { items: true },
    });
    expect(orders).toHaveLength(1);
    expect(orders[0].items).toHaveLength(3);
    const qtyByItem = new Map(orders[0].items.map((i) => [i.menuItemId, i.quantity]));
    expect(qtyByItem.get(menuItems.shawarmaChicken.id)).toBe(1);
    expect(qtyByItem.get(menuItems.fries.id)).toBe(1);
    expect(qtyByItem.get(menuItems.cola.id)).toBe(3);
  });

  it('uses the persisted cart when the LLM passes no items at all', async () => {
    const cart = await seedCart();
    const { business, customer } = fixture;

    const result = await executeTool({
      toolCall: {
        name: 'submit_order',
        arguments: { orderType: 'pickup' },
      } as any,
      businessId: business.id,
      customerId: customer.id,
      cartState: cart,
    });

    expect(result.success).toBe(true);
    const orders = await prisma.order.findMany({
      where: { businessId: business.id },
      include: { items: true },
    });
    expect(orders[0].items).toHaveLength(3);
  });

  it('handleSubmitOrder reads cart when items not provided (defence-in-depth)', async () => {
    const { business, customer, menuItems, options } = fixture;

    await handleAddToCart(business.id, customer.id, {
      items: [
        { itemId: menuItems.shawarmaChicken.id, quantity: 2, optionId: options.largeOption.id },
        { itemId: menuItems.fries.id, quantity: 1 },
      ],
    });

    const { handleSubmitOrder } = await import('../../../tools/submit-order.js');
    const result = await handleSubmitOrder(business.id, customer.id, {
      items: [],
      orderType: 'pickup',
    });

    expect(result).toContain('Order ORD-');
    const orders = await prisma.order.findMany({
      where: { businessId: business.id },
      include: { items: true },
    });
    expect(orders[0].items).toHaveLength(2);
  });
});
