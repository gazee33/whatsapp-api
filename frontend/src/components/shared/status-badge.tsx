"use client";

import { cn, getOrderStatusConfig, getComplaintStatusConfig } from "@/lib/utils";
import { useLanguage } from "@/i18n/language-context";

interface StatusBadgeProps {
  status: string;
  type?: "order" | "complaint";
  className?: string;
}

export function StatusBadge({ status, type = "order", className }: StatusBadgeProps) {
  const { t } = useLanguage();
  const configMap: Record<string, { label: string; color: string; bgColor?: string }> =
    type === "order"
      ? getOrderStatusConfig(t)
      : getComplaintStatusConfig(t);
  const config = configMap[status];

  if (!config) return <span className="text-xs text-muted-foreground">{status}</span>;

  const bgClass = "bgColor" in config ? config.bgColor as string : "bg-gray-100 dark:bg-gray-800";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        bgClass,
        config.color,
        className
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", "bg-current")} />
      {config.label}
    </span>
  );
}
