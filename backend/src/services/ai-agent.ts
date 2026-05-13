import { createLLMProvider } from '../llm/factory.js';
import { AIAgentService } from './ai-engine/index.js';
import type { Business, Customer } from '@prisma/client';

export { AIAgentService };

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export async function processMessage(
  business: Business,
  customer: Customer,
  text: string,
  locationData?: LocationData,
): Promise<{ reply: string; orderId?: string; didSendMessage?: boolean }> {
  const llmProvider = createLLMProvider();
  const agent = new AIAgentService(llmProvider, business.id);
  const result = await agent.processMessage({
    customerId: customer.id,
    message: text,
    customerName: customer.name || undefined,
    customerPhone: customer.phone,
    locationData,
  });
  return { reply: result.reply, orderId: result.orderId, didSendMessage: result.didSendMessage };
}
