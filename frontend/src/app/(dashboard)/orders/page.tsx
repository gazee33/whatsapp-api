"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Clock, ChevronRight } from "lucide-react";
import { useOrderStore } from "@/stores/order-store";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatCurrency, formatTimeAgo } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const STATUS_TABS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const router = useRouter();
  const { orders, isLoading, statusFilter, fetchOrders, setStatusFilter } =
    useOrderStore();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTabChange = (value: string) => {
    const filter = value as OrderStatus | "all";
    setStatusFilter(filter);
    fetchOrders(filter === "all" ? undefined : filter);
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <SkeletonBlock className="h-7 w-20" />
          <SkeletonBlock className="mt-1 h-3 w-56" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9 w-20 rounded-md" />
          ))}
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <SkeletonBlock className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-4 w-24" />
                    <SkeletonBlock className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-3 w-20" />
                    <SkeletonBlock className="h-3 w-16" />
                    <SkeletonBlock className="h-3 w-14" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all incoming orders
          </p>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description={
            statusFilter !== "all"
              ? `No orders with status "${statusFilter}"`
              : "Orders will appear here when customers place them"
          }
        />
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/orders/${order.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      "bg-primary/10 text-primary"
                    )}
                  >
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{order.referenceId}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {order.customer && (
                        <span>{order.customer.phone}</span>
                      )}
                      {order.items && (
                        <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(order.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {formatCurrency(order.totalPrice)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
