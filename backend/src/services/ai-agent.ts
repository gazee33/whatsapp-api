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
): Promise<string> {
  const llmProvider = createLLMProvider();
  const agent = new AIAgentService(llmProvider, business.id);
  const result = await agent.processMessage({
    customerId: customer.id,
    message: text,
    locationData,
  });
  return result.reply;
}
