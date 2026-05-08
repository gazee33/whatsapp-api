import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "SAR"): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTimeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: "Pending", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  confirmed: { label: "Confirmed", color: "text-blue-700", bgColor: "bg-blue-100" },
  preparing: { label: "Preparing", color: "text-purple-700", bgColor: "bg-purple-100" },
  ready: { label: "Ready", color: "text-green-700", bgColor: "bg-green-100" },
  delivered: { label: "Delivered", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  cancelled: { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-100" },
};

export const COMPLAINT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "text-red-600" },
  resolved: { label: "Resolved", color: "text-green-600" },
  closed: { label: "Closed", color: "text-gray-500" },
};

export function getOrderStatusConfig(t: (key: string) => string) {
  return {
    pending: { label: t("status.pending"), color: "text-yellow-700", bgColor: "bg-yellow-100" },
    confirmed: { label: t("status.confirmed"), color: "text-blue-700", bgColor: "bg-blue-100" },
    preparing: { label: t("status.preparing"), color: "text-purple-700", bgColor: "bg-purple-100" },
    ready: { label: t("status.ready"), color: "text-green-700", bgColor: "bg-green-100" },
    delivered: { label: t("status.delivered"), color: "text-emerald-700", bgColor: "bg-emerald-100" },
    cancelled: { label: t("status.cancelled"), color: "text-red-700", bgColor: "bg-red-100" },
  };
}

export function getComplaintStatusConfig(t: (key: string) => string) {
  return {
    open: { label: t("status.open"), color: "text-red-600" },
    resolved: { label: t("status.resolved"), color: "text-green-600" },
    closed: { label: t("status.closed"), color: "text-gray-500" },
  };
}
