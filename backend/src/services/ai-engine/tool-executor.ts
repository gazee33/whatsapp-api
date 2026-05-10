import type { ToolCall } from '../../llm/types.js';
import { handleQueryMenu } from '../../tools/query-menu.js';
import { handleSubmitOrder } from '../../tools/submit-order.js';
import { handleCheckStatus } from '../../tools/check-status.js';
import { handleFileComplaint } from '../../tools/file-complaint.js';
import { handleQueryZones } from '../../tools/query-zones.js';
import { handleCheckRestaurantInfo } from '../../tools/check-restaurant-info.js';
import { handleSetDeliveryAddress } from '../../tools/set-delivery-address.js';
import type { QueryMenuParams } from '../../tools/query-menu.js';
import type { SubmitOrderParams } from '../../tools/submit-order.js';
import type { CheckStatusParams } from '../../tools/check-status.js';
import type { FileComplaintParams } from '../../tools/file-complaint.js';
import type { QueryZonesParams } from '../../tools/query-zones.js';
import type { CheckRestaurantInfoParams } from '../../tools/check-restaurant-info.js';
import type { SetDeliveryAddressParams } from '../../tools/set-delivery-address.js';
import { type CartState, emptyCartState } from './cart-state.js';

export interface ToolExecutionResult {
  result: string;
  cartState?: CartState;
  createdOrderId?: string;
}

function normalizeToolArgs<T>(args: unknown): T {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args) as T;
    } catch (err) {
      console.error('[normalizeToolArgs] Failed to parse tool arguments:', args);
      throw new Error(`Invalid tool arguments format: ${(args as string).substring(0, 200)}`);
    }
  }
  return (args ?? {}) as T;
}

function extractCreatedOrderId(toolResult: string): string | undefined {
  return toolResult.match(/Order #([a-f0-9-]+)/i)?.[1];
}

export async function executeTool(params: {
  toolCall: ToolCall;
  businessId: string;
  customerId: string;
  cartState: CartState;
}): Promise<ToolExecutionResult> {
  const { toolCall, businessId, customerId, cartState } = params;

  switch (toolCall.name) {
    case 'query_menu': {
      const toolParams = normalizeToolArgs<QueryMenuParams>(toolCall.arguments);
      const result = await handleQueryMenu(businessId, toolParams);
      return { result };
    }

    case 'submit_order': {
      const toolParams = normalizeToolArgs<SubmitOrderParams>(toolCall.arguments);

      if (toolParams && typeof (toolParams as any).items === 'string') {
        try {
          (toolParams as any).items = JSON.parse((toolParams as any).items);
        } catch {
          console.error('[executeTool] items field is not valid JSON:', (toolParams as any).items);
          return {
            result: 'The order items data was malformed. Please try again with valid item names and quantities.',
          };
        }
      }

      const result = await handleSubmitOrder(businessId, customerId, toolParams);
      const createdOrderId = extractCreatedOrderId(result);

      return {
        result,
        createdOrderId,
        cartState: createdOrderId ? emptyCartState() : cartState,
      };
    }

    case 'check_order_status': {
      const toolParams = normalizeToolArgs<CheckStatusParams>(toolCall.arguments);
      const result = await handleCheckStatus(businessId, customerId, toolParams);
      return { result };
    }

    case 'file_complaint': {
      const toolParams = normalizeToolArgs<FileComplaintParams>(toolCall.arguments);
      const result = await handleFileComplaint(businessId, customerId, toolParams);
      return { result };
    }

    case 'query_zones': {
      const toolParams = normalizeToolArgs<QueryZonesParams>(toolCall.arguments);
      const result = await handleQueryZones(businessId, toolParams);
      return { result };
    }

    case 'check_restaurant_info': {
      const toolParams = normalizeToolArgs<CheckRestaurantInfoParams>(toolCall.arguments);
      const result = await handleCheckRestaurantInfo(businessId, toolParams);
      return { result };
    }

    case 'set_delivery_address': {
      const toolParams = normalizeToolArgs<SetDeliveryAddressParams>(toolCall.arguments);
      const result = await handleSetDeliveryAddress(businessId, customerId, toolParams);
      return { result };
    }

    default:
      return { result: `Unknown tool: ${toolCall.name}` };
  }
}
