import {
  ChatMessage,
  ToolDefinition,
  ToolCall,
  LLMResponse,
  LLMProvider,
} from './types.js';

/**
 * Mock LLM Provider for testing purposes
 * Returns simulated responses based on the menu items
 */
export class MockProvider implements LLMProvider {
  private modelName: string;

  constructor(modelName: string = 'mock') {
    this.modelName = modelName;
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    // Get the last user message
    const userMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user');

    const text = userMessage?.content?.toLowerCase() || '';

    // Check for ordering intent (English + Arabic)
    const hasOrderIntent =
      text.includes('order') ||
      text.includes('want') ||
      text.includes('get') ||
      text.includes('shawarma') ||
      text.includes('pepsi') ||
      text.includes('شاورما') ||
      text.includes('طلب') ||
      text.includes('عطني') ||
      text.includes('ابغى') ||
      text.includes('بيبي') ||
      text.includes('ليمون');

    // Check for items mentioned (English + Arabic)
    const items: Record<string, any>[] = [];

    // Shawarma Chicken - 5 SAR
    if (
      text.includes('shawarma chicken') || text.includes('chicken shawarma') ||
      text.includes('شاورما دجاج') || text.includes('شاورما الدجاج')
    ) {
      const qtyMatch = text.match(/(\d+)\s*(?:x|copy)?\s*(?:shawarma chicken|chicken shawarma|شاورما\s*دجاج)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      items.push({ name: 'شاورما دجاج', quantity: qty, unitPrice: 5 });
    }

    // Shawarma Meat - 6 SAR
    if (
      text.includes('shawarma meat') || text.includes('meat shawarma') ||
      text.includes('شاورما لحم') || text.includes('شاورما اللحم')
    ) {
      const qtyMatch = text.match(/(\d+)\s*(?:x|copy)?\s*(?:shawarma meat|meat shawarma|شاورما\s*لحم)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      items.push({ name: 'شاورما لحم', quantity: qty, unitPrice: 6 });
    }

    // Pepsi - 1.5 SAR
    if (text.includes('pepsi') || text.includes('بيبسي')) {
      const qtyMatch = text.match(/(\d+)\s*(?:x|copy)?\s*(?:pepsi|بيبسي)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      items.push({ name: 'بيبسي', quantity: qty, unitPrice: 1.5 });
    }

    // Lemon Mint - 3 SAR
    if (
      text.includes('lemon mint') || text.includes('lemonade') ||
      text.includes('ليمون') || text.includes('ليمون بالنعناع')
    ) {
      const qtyMatch = text.match(/(\d+)\s*(?:x|copy)?\s*(?:lemon mint|lemonade|ليمون)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      items.push({ name: 'ليمون بالنعناع', quantity: qty, unitPrice: 3 });
    }

    let responseContent: string;
    let toolCalls: ToolCall[] = [];

    if (hasOrderIntent && items.length > 0) {
      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const itemSummary = items
        .map((item) => `${item.quantity}x ${item.name} (${item.quantity * item.unitPrice} ريال)`)
        .join(', ');

      responseContent = `تمام! فهمت طلبك: ${itemSummary}\n\nالإجمالي: ${total.toFixed(2)} ريال\n\nتبي تأكد الطلب؟`;

      toolCalls = [
        {
          id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'submit_order',
          arguments: {
            items: items,
            notes: '',
          },
        },
      ];
    } else if (hasOrderIntent) {
      responseContent =
        "I'd be happy to help you place an order! Could you please tell me what items you'd like to order and the quantities?";
    } else {
      responseContent =
        "I'd be happy to help you! You can ask me about our menu, prices, or tell me what you'd like to order.";
    }

    return {
      content: responseContent,
      toolCalls,
    };
  }
}
