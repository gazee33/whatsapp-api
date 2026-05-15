import type { Order, RestaurantSettings } from "@/lib/types";

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: "Delivery",
  dine_in: "Dine In",
  pickup: "Pickup",
};

export function renderReceiptHTML(
  order: Order,
  settings: RestaurantSettings
): string {
  const itemsHtml = (order.items ?? [])
    .map(
      (item) => `
          <tr>
            <td class="item-name">${escapeHtml(item.menuItem?.name ?? "?")}</td>
            <td class="item-qty">x${item.quantity}</td>
            <td class="item-price">${formatPrice(
              (item.menuItem?.basePrice ?? 0) * item.quantity,
              settings.currency
            )}</td>
          </tr>
          ${item.notes ? `<tr><td class="item-note" colspan="3">${escapeHtml(item.notes)}</td></tr>` : ""}`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Order #${escapeHtml(order.referenceId)}</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 48mm;
    margin: 0 auto;
    padding: 2mm 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    color: #000;
    line-height: 1.3;
  }
  .center { text-align: center; }
  .header { margin-bottom: 2mm; }
  .header h1 { font-size: 14px; font-weight: bold; margin-bottom: 0.5mm; }
  .header p { font-size: 9px; color: #333; }
  .divider { border: none; border-top: 1px dashed #000; margin: 1.5mm 0; }
  .info-table { width: 100%; font-size: 9px; margin-bottom: 1mm; }
  .info-table td { vertical-align: top; padding: 0.5mm 0; }
  .info-table td:first-child { width: 28%; color: #555; }
  .info-table td:last-child { width: 72%; }
  .section-title { font-size: 9px; font-weight: bold; margin-bottom: 0.5mm; }
  .items-table { width: 100%; border-collapse: collapse; font-size: 9px; }
  .items-table th {
    text-align: left;
    font-size: 8px;
    color: #555;
    border-bottom: 1px dashed #000;
    padding: 0.5mm 0;
  }
  .items-table th:last-child,
  .items-table th:nth-last-child(2) { text-align: right; }
  .items-table td { padding: 0.5mm 0; vertical-align: top; }
  .item-name { width: 60%; }
  .item-qty { width: 15%; text-align: center; }
  .item-price { width: 25%; text-align: right; }
  .item-note { font-size: 8px; color: #666; font-style: italic; padding-left: 2mm; padding-top: 0; }
  .total-row td { padding: 0.5mm 0; }
  .total-label { font-size: 11px; font-weight: bold; }
  .total-amount { font-size: 12px; font-weight: bold; text-align: right; }
  .notes-box { font-size: 8px; color: #333; margin: 1mm 0; }
  .footer { margin-top: 2mm; font-size: 9px; color: #555; }
  @media print {
    html, body { width: 48mm; }
  }
</style>
</head>
<body>
  <div class="header center">
    <h1>${escapeHtml(settings.name)}</h1>
    ${settings.phoneNumber ? `<p>${escapeHtml(settings.phoneNumber)}</p>` : ""}
    ${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ""}
  </div>

  <hr class="divider">

  <table class="info-table">
    <tr><td>Order #</td><td>${escapeHtml(order.referenceId)}</td></tr>
    <tr><td>Date</td><td>${formatDate(order.createdAt)}</td></tr>
    <tr><td>Type</td><td>${ORDER_TYPE_LABELS[order.orderType ?? ""] ?? order.orderType ?? "-"}</td></tr>
  </table>

  <hr class="divider">

  <table class="info-table">
    ${order.customer?.name ? `<tr><td>Customer</td><td>${escapeHtml(order.customer.name)}</td></tr>` : ""}
    ${order.customer?.phone ? `<tr><td>Phone</td><td>${escapeHtml(order.customer.phone)}</td></tr>` : ""}
    ${order.contactPhone ? `<tr><td>Contact</td><td>${escapeHtml(order.contactPhone)}</td></tr>` : ""}
    ${order.deliveryAddress ? `<tr><td>Address</td><td>${escapeHtml(order.deliveryAddress)}</td></tr>` : ""}
    ${order.deliveryNotes ? `<tr><td>Del. Notes</td><td>${escapeHtml(order.deliveryNotes)}</td></tr>` : ""}
  </table>

  <hr class="divider">

  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <hr class="divider">

  <table class="items-table">
    <tr class="total-row">
      <td class="total-label">TOTAL</td>
      <td></td>
      <td class="total-amount">${formatPrice(order.totalPrice, settings.currency)}</td>
    </tr>
  </table>

  ${order.notes ? `<hr class="divider"><div class="notes-box"><strong>Notes:</strong> ${escapeHtml(order.notes)}</div>` : ""}

  <hr class="divider">

  <div class="footer center">
    <p>Thank you for your order!</p>
  </div>

  <script>
    window.onafterprint = () => window.close();
    window.focus();
    window.print();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
