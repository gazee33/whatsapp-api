import { tenantClient } from "@/lib/api-client";
import type { Order, RestaurantSettings } from "@/lib/types";
import { renderReceiptHTML } from "@/components/receipt/receipt-template";

export async function printReceipt(orderId: string): Promise<void> {
  try {
    const [orderRes, settingsRes] = await Promise.all([
      tenantClient.get<Order>(`/orders/${orderId}`),
      tenantClient.get<RestaurantSettings>("/settings"),
    ]);

    const html = renderReceiptHTML(orderRes.data, settingsRes.data);
    openPrintWindow(html);
  } catch (err) {
    console.error("Failed to print receipt:", err);
  }
}

function openPrintWindow(html: string): void {
  const win = window.open("", "_blank", "width=384,height=600,menubar=no,toolbar=no,location=no");

  if (!win) {
    const fallback = window.open();
    if (!fallback) return;
    fallback.document.write(html);
    fallback.document.close();
    setTimeout(() => fallback.print(), 500);
    return;
  }

  win.document.write(html);
  win.document.close();
  win.focus();
}
