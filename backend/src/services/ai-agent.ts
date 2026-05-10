import { createLLMProvider } from '../llm/factory.js';
import { AIAgentService } from './ai-engine/index.js';
import type { Business, Customer } from '@prisma/client';

export { AIAgentService };

export async function processMessage(
  business: Business,
  customer: Customer,
  text: string,
): Promise<string> {
  const llmProvider = createLLMProvider();
  const agent = new AIAgentService(llmProvider, business.id);
  const result = await agent.processMessage({
    customerId: customer.id,
    message: text,
  });
  return result.reply;
}
