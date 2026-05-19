import type { Business, Manager, RestaurantSettings } from '@prisma/client';
import { createLLMProvider } from '../llm/factory.js';
import { ManagerAIAgentService } from './ai-engine/manager-ai-agent-service.js';

type BusinessWithSettings = Business & { settings: RestaurantSettings | null };

export interface ManagerAgentResult {
  reply: string;
  didSendMessage?: boolean;
}

export async function processManagerMessage(
  business: BusinessWithSettings,
  manager: Manager,
  text: string,
  _locationData?: { latitude: number; longitude: number; name?: string; address?: string },
): Promise<ManagerAgentResult> {
  const llmProvider = await createLLMProvider();
  const agent = new ManagerAIAgentService(llmProvider, business.id);

  return agent.processMessage({
    managerId: manager.id,
    managerPhone: manager.phone,
    message: text,
    business,
    manager,
  });
}
