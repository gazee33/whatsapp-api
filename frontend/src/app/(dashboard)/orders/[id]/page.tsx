"use client";

import { useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  User,
  Phone,
  Package,
  FileText,
} from "lucide-react";
import { useOrderStore } from "@/stores/order-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { DetailSkeleton } from "@/components/shared/skeletons";
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_CONFIG,
} from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentOrder, isLoading, fetchOrder, updateOrderStatus } =
    useOrderStore();

  useEffect(() => {
    fetchOrder(id);
  }, [fetchOrder, id]);

  const handleStatusChange = useCallback(
    (status: string) => {
      updateOrderStatus(id, status as OrderStatus);
    },
    [id, updateOrderStatus]
  );

  if (isLoading || !currentOrder) {
    return <DetailSkeleton />;
  }

  const order = currentOrder;
  const customer = order.customer;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="-ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order {order.referenceId}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage order details and status
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Items</CardTitle>
              <span className="text-sm font-semibold">
                {formatCurrency(order.totalPrice)}
              </span>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="divide-y">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {item.menuItem?.name ?? "Unknown item"}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {item.quantity} x{" "}
                          {formatCurrency(
                            item.menuItem?.price ?? 0
                          )}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {formatCurrency(
                            item.quantity * (item.menuItem?.price ?? 0)
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items</p>
              )}
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Order Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {order.notes}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDate(order.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 order-1 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Current Status
                </span>
                <StatusBadge status={order.status} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Change Status</label>
                <Select
                  value={order.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => {
                      const config = ORDER_STATUS_CONFIG[status];
                      return (
                        <SelectItem key={status} value={status}>
                          <span className={config.color}>{config.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
