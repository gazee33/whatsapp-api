import type { ToolDefinition } from '../../llm/types.js';
import type { ManagerToolContext, ManagerToolResult } from './index.js';
import { getWhatsAppCredentials } from '../../services/whatsapp-helpers.js';
import { sendWhatsAppInteractiveButton } from '../../services/whatsapp-sender.js';

// ── Tool definition ───────────────────────────────────────────────────────────

export const managerConfirmDefinition: ToolDefinition = {
  name: 'manager_confirm',
  description:
    'Send the manager an interactive YES / NO button prompt on WhatsApp before executing a destructive or irreversible action. Call this tool, then end your turn — do NOT call the destructive tool yet. The manager\'s next reply ("YES" button = confirm_yes, "NO" button = confirm_no) will arrive as the next user message and the conversation history will tell you whether to proceed.',
  parameters: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description:
          'One-sentence plain-language description of the action that needs confirmation. Example: "Delete the menu item Chicken Shawarma — this cannot be undone."',
      },
    },
    required: ['summary'],
  },
};

// ── Handler ───────────────────────────────────────────────────────────────────

interface ConfirmArgs {
  summary: string;
}

export async function handleManagerConfirm(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { summary } = args as ConfirmArgs;

  if (!summary || !summary.trim()) {
    return {
      success: false,
      result: 'A non-empty summary is required for the confirmation prompt.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  const creds = await getWhatsAppCredentials(ctx.businessId);
  if (!creds) {
    return {
      success: false,
      result: 'WhatsApp is not configured for this business — cannot send confirmation prompt.',
      errorCode: 'NOT_CONFIGURED',
    };
  }

  const result = await sendWhatsAppInteractiveButton({
    business: ctx.business,
    phoneNumberId: creds.phoneNumberId,
    to: ctx.managerPhone,
    bodyText: `⚠️ Confirm action:\n\n${summary.trim()}`,
    footerText: 'Tap YES to proceed or NO to cancel.',
    buttons: [
      { id: 'confirm_yes', title: 'YES ✓' },
      { id: 'confirm_no', title: 'NO ✗' },
    ],
  });

  if (!result?.messageId) {
    return {
      success: false,
      result: 'Failed to send the confirmation prompt via WhatsApp. The action was NOT taken.',
      errorCode: 'SEND_FAILED',
    };
  }

  return {
    success: true,
    result:
      "Confirmation prompt sent — the manager's next reply will be YES or NO. Do NOT call the destructive tool now; wait for their answer.",
    didSendMessage: true,
  };
}
