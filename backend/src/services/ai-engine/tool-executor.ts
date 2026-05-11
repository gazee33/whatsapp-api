import type { ToolCall } from '../../llm/types.js';
import { handleQueryMenu } from '../../tools/query-menu.js';
import { handleSubmitOrder } from '../../tools/submit-order.js';
import { handleCheckStatus } from '../../tools/check-status.js';
import { handleFileComplaint } from '../../tools/file-complaint.js';
import { handleCheckRestaurantInfo } from '../../tools/check-restaurant-info.js';
import { handleSetDeliveryAddress } from '../../tools/set-delivery-address.js';
import { handleRequestConfirmation } from '../../tools/request-confirmation.js';
import type { QueryMenuParams } from '../../tools/query-menu.js';
import type { SubmitOrderParams } from '../../tools/submit-order.js';
import type { CheckStatusParams } from '../../tools/check-status.js';
import type { FileComplaintParams } from '../../tools/file-complaint.js';
import type { CheckRestaurantInfoParams } from '../../tools/check-restaurant-info.js';
import type { SetDeliveryAddressParams } from '../../tools/set-delivery-address.js';
import { type CartState, emptyCartState } from './cart-state.js';

export interface ToolExecutionResult {
  success: boolean;
  result: string;
  errorCode?: string;
  cartState?: CartState;
  createdOrderId?: string;
}

function normalizeToolArgs<T>(args: unknown): T {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args) as T;
    } catch (err) {
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
      return { success: true, result };
    }

    case 'request_confirmation': {
      const execResult = await handleRequestConfirmation(customerId, cartState);
      return { success: execResult.success, result: execResult.result, cartState: execResult.cartState };
    }

    case 'submit_order': {
      if (cartState.mode === 'order_submitted') {
        return {
          success: false,
          result: 'This order has already been submitted. Please start a new order if you want to order again.',
          errorCode: 'ORDER_ALREADY_SUBMITTED',
        };
      }

      if (cartState.mode !== 'awaiting_confirmation') {
        return {
          success: false,
          result: 'Please call request_confirmation first to get the customer\'s explicit approval before submitting.',
          errorCode: 'CONFIRMATION_REQUIRED',
        };
      }

      const toolParams = normalizeToolArgs<SubmitOrderParams>(toolCall.arguments);

      if (toolParams && typeof (toolParams as any).items === 'string') {
        try {
          (toolParams as any).items = JSON.parse((toolParams as any).items);
        } catch {
          return {
            success: false,
            result: 'The order items data was malformed. Please try again with valid item names and quantities.',
            errorCode: 'MALFORMED_ORDER_ITEMS',
          };
        }
      }

      const result = await handleSubmitOrder(businessId, customerId, toolParams);
      const createdOrderId = extractCreatedOrderId(result);

      return {
        success: !!createdOrderId,
        result,
        createdOrderId,
        errorCode: !createdOrderId ? 'SUBMIT_ORDER_FAILED' : undefined,
        cartState: createdOrderId ? { ...emptyCartState(), language: cartState.language } : cartState,
      };
    }

    case 'check_order_status': {
      const toolParams = normalizeToolArgs<CheckStatusParams>(toolCall.arguments);
      const result = await handleCheckStatus(businessId, customerId, toolParams);
      return { success: true, result };
    }

    case 'file_complaint': {
      const toolParams = normalizeToolArgs<FileComplaintParams>(toolCall.arguments);
      const result = await handleFileComplaint(businessId, customerId, toolParams);
      const isValidationError = result.startsWith('Please provide');
      return {
        success: !isValidationError,
        result,
        errorCode: isValidationError ? 'MISSING_COMPLAINT_CONTENT' : undefined,
      };
    }

    case 'check_restaurant_info': {
      const toolParams = normalizeToolArgs<CheckRestaurantInfoParams>(toolCall.arguments);
      const result = await handleCheckRestaurantInfo(businessId, toolParams);
      return { success: true, result };
    }

    case 'set_delivery_address': {
      const toolParams = normalizeToolArgs<SetDeliveryAddressParams>(toolCall.arguments);
      const execResult = await handleSetDeliveryAddress(businessId, customerId, toolParams);
      return {
        success: execResult.success,
        result: execResult.result,
        errorCode: execResult.success ? undefined : 'INVALID_DELIVERY_ADDRESS',
        cartState: execResult.success ? execResult.cartState : cartState,
      };
    }

    default:
      return { success: false, result: `Unknown tool: ${toolCall.name}`, errorCode: 'UNKNOWN_TOOL' };
  }
}
