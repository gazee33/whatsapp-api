import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_CONFIG,
  COMPLAINT_STATUS_CONFIG,
} from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "order" | "complaint";
  className?: string;
}

export function StatusBadge({ status, type = "order", className }: StatusBadgeProps) {
  const config =
    type === "order"
      ? ORDER_STATUS_CONFIG[status]
      : COMPLAINT_STATUS_CONFIG[status];

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
