import type { ToolCall } from '../../llm/types.js';
import { handleQueryMenu } from '../../tools/query-menu.js';
import { handleSubmitOrder } from '../../tools/submit-order.js';
import { handleCheckStatus } from '../../tools/check-status.js';
import { handleFileComplaint } from '../../tools/file-complaint.js';
import { handleCheckRestaurantInfo } from '../../tools/check-restaurant-info.js';
import { handleSetDeliveryAddress } from '../../tools/set-delivery-address.js';
import { handleAddToCart } from '../../tools/add-to-cart.js';
import { handleUpdateCart } from '../../tools/update-cart.js';
import { handleRemoveFromCart } from '../../tools/remove-from-cart.js';
import { handleFlagCustomer } from '../../tools/flag-customer.js';
import { sendInteractiveList } from '../../tools/send-interactive-list.js';
import { sendInteractiveButton } from '../../tools/send-interactive-button.js';
import { sendTemplateMessage } from '../../tools/send-template-message.js';
import type { RemoveFromCartParams } from '../../tools/remove-from-cart.js';
import type { QueryMenuParams } from '../../tools/query-menu.js';
import type { SubmitOrderParams } from '../../tools/submit-order.js';
import type { CheckStatusParams } from '../../tools/check-status.js';
import type { FileComplaintParams } from '../../tools/file-complaint.js';
import type { CheckRestaurantInfoParams } from '../../tools/check-restaurant-info.js';
import type { SetDeliveryAddressParams } from '../../tools/set-delivery-address.js';
import type { AddToCartParams } from '../../tools/add-to-cart.js';
import type { UpdateCartParams } from '../../tools/update-cart.js';
import type { FlagCustomerParams } from '../../tools/flag-customer.js';
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
  return toolResult.match(/Order (ORD-\d+-[A-F0-9]+)/)?.[1];
}

export async function executeTool(params: {
  toolCall: ToolCall;
  businessId: string;
  customerId: string;
  cartState: CartState;
  customerPhone?: string;
}): Promise<ToolExecutionResult> {
  const { toolCall, businessId, customerId, cartState, customerPhone } = params;

  switch (toolCall.name) {
    case 'query_menu': {
      const toolParams = normalizeToolArgs<QueryMenuParams>(toolCall.arguments);
      const result = await handleQueryMenu(businessId, toolParams);
      return { success: true, result };
    }

    case 'add_to_cart': {
      const toolParams = normalizeToolArgs<AddToCartParams>(toolCall.arguments);
      const execResult = await handleAddToCart(businessId, customerId, toolParams);
      return {
        success: execResult.success,
        result: execResult.result,
        errorCode: execResult.success ? undefined : 'ADD_TO_CART_FAILED',
        cartState: execResult.success ? execResult.cartState : cartState,
      };
    }

    case 'update_cart': {
      const toolParams = normalizeToolArgs<UpdateCartParams>(toolCall.arguments);
      const execResult = await handleUpdateCart(businessId, customerId, toolParams);
      return {
        success: execResult.success,
        result: execResult.result,
        errorCode: execResult.success ? undefined : 'UPDATE_CART_FAILED',
        cartState: execResult.success ? execResult.cartState : cartState,
      };
    }

    case 'remove_from_cart': {
      const toolParams = normalizeToolArgs<RemoveFromCartParams>(toolCall.arguments);
      const execResult = await handleRemoveFromCart(businessId, customerId, toolParams);
      return {
        success: execResult.success,
        result: execResult.result,
        errorCode: execResult.success ? undefined : 'REMOVE_FROM_CART_FAILED',
        cartState: execResult.success ? execResult.cartState : cartState,
      };
    }

    case 'submit_order': {
      if (cartState.mode === 'order_submitted') {
        return {
          success: false,
          result: 'This order has already been submitted. Please start a new order if you want to order again.',
          errorCode: 'ORDER_ALREADY_SUBMITTED',
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

      if ((!toolParams.items || toolParams.items.length === 0) && cartState.items.length > 0) {
        toolParams.items = cartState.items.map((item) => ({
          itemId: item.menuItemId,
          quantity: item.quantity,
          optionName: item.optionName,
          notes: item.notes,
        }));
      }

      if (!toolParams.orderType && cartState.orderType) {
        toolParams.orderType = cartState.orderType;
      }

      if (!toolParams.deliveryAddress && cartState.deliveryLocation?.address) {
        toolParams.deliveryAddress = cartState.deliveryLocation.address;
      }

      if (!toolParams.contactPhone && customerPhone) {
        toolParams.contactPhone = customerPhone;
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

    case 'flag_customer': {
      const toolParams = normalizeToolArgs<FlagCustomerParams>(toolCall.arguments);
      const execResult = await handleFlagCustomer(businessId, customerId, toolParams);
      return {
        success: execResult.success,
        result: execResult.result,
        errorCode: execResult.success ? undefined : 'FLAG_CUSTOMER_FAILED',
      };
    }

    case 'send_interactive_list': {
      const { headerText, bodyText, footerText, buttonText, sections } = toolCall.arguments as any;
      const result = await sendInteractiveList({
        businessId,
        customerId,
        headerText,
        bodyText,
        footerText,
        buttonText,
        sections,
      });
      return {
        success: result.success,
        result: result.success
          ? `Interactive list sent successfully. Customer will receive the options and can select from the list.`
          : `Failed to send interactive list: ${result.error}`,
        errorCode: result.success ? undefined : 'INTERACTIVE_LIST_FAILED',
      };
    }

    case 'send_interactive_button': {
      const { headerText, bodyText, footerText, buttons } = toolCall.arguments as any;
      const result = await sendInteractiveButton({
        businessId,
        customerId,
        headerText,
        bodyText,
        footerText,
        buttons,
      });
      return {
        success: result.success,
        result: result.success
          ? `Interactive buttons sent successfully. Customer will see the options and can tap to respond.`
          : `Failed to send interactive button: ${result.error}`,
        errorCode: result.success ? undefined : 'INTERACTIVE_BUTTON_FAILED',
      };
    }

    case 'send_template_message': {
      const { templateName, languageCode, components } = toolCall.arguments as any;
      const result = await sendTemplateMessage({
        businessId,
        customerId,
        templateName,
        languageCode,
        components,
      });
      return {
        success: result.success,
        result: result.success
          ? `Template message sent successfully.`
          : `Failed to send template message: ${result.error}`,
        errorCode: result.success ? undefined : 'TEMPLATE_MESSAGE_FAILED',
      };
    }

    default:
      return { success: false, result: `Unknown tool: ${toolCall.name}`, errorCode: 'UNKNOWN_TOOL' };
  }
}
