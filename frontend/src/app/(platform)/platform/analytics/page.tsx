"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  BarChart3,
} from "lucide-react";
import { usePlatformStore } from "@/stores/platform-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsSkeleton, SkeletonBlock } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, ORDER_STATUS_CONFIG } from "@/lib/utils";

const STATUS_BAR_COLORS: Record<string, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-blue-400",
  preparing: "bg-purple-400",
  ready: "bg-green-400",
  delivered: "bg-emerald-400",
  cancelled: "bg-red-400",
};

const DAY_OPTIONS = [7, 30, 90] as const;

export default function PlatformAnalyticsPage() {
  const analytics = usePlatformStore((s) => s.analytics);
  const isLoading = usePlatformStore((s) => s.isLoading);
  const fetchAnalytics = usePlatformStore((s) => s.fetchAnalytics);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    fetchAnalytics(days);
  }, [fetchAnalytics, days]);

  const statusTotal = useMemo(() => {
    if (!analytics?.orderStatusBreakdown) return 0;
    return Object.values(analytics.orderStatusBreakdown).reduce(
      (a, b) => a + b,
      0
    );
  }, [analytics]);

  if (isLoading)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="mt-1 h-3 w-56" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-4" />
            <SkeletonBlock className="h-9 w-14" />
            <SkeletonBlock className="h-9 w-14" />
            <SkeletonBlock className="h-9 w-14" />
          </div>
        </div>
        <StatsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6 pb-3">
              <SkeletonBlock className="h-5 w-36" />
            </div>
            <div className="px-6 pb-6 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-col space-y-1.5 p-6 pb-3">
                  <SkeletonBlock className="h-5 w-40" />
                </div>
                <div className="px-6 pb-6 space-y-3">
                  <SkeletonBlock className="h-4 w-full rounded-full" />
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <SkeletonBlock className="h-3 w-3 rounded-full" />
                        <SkeletonBlock className="h-3 w-12" />
                        <SkeletonBlock className="ml-auto h-3 w-4" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (!analytics) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analytics data"
        description="Analytics data is not available yet."
      />
    );
  }

  const { summary, ordersByDay, orderStatusBreakdown, topBusinesses } =
    analytics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Detailed platform performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Businesses",
            value: summary.totalBusinesses,
            icon: Building2,
            color: "text-blue-600",
          },
          {
            label: "Total Orders",
            value: summary.totalOrders,
            icon: ShoppingBag,
            color: "text-purple-600",
          },
          {
            label: "Total Revenue",
            value: formatCurrency(summary.totalRevenue),
            icon: DollarSign,
            color: "text-emerald-600",
          },
          {
            label: `Orders (${days} days)`,
            value: summary.ordersLast30Days,
            icon: TrendingUp,
            color: "text-orange-600",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Orders by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByDay.length > 0 ? (
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">
                        Orders
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersByDay.map((day) => (
                      <tr key={day.date} className="border-b last:border-0">
                        <td className="py-2">{formatDate(day.date)}</td>
                        <td className="py-2 text-right font-medium">
                          {day.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No order data for this period.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Order Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusTotal > 0 ? (
                <>
                  <div className="flex h-4 w-full overflow-hidden rounded-full">
                    {Object.entries(orderStatusBreakdown).map(
                      ([status, count]) => (
                        <div
                          key={status}
                          className={STATUS_BAR_COLORS[status] || "bg-gray-300"}
                          style={{
                            width: `${(count / statusTotal) * 100}%`,
                          }}
                        />
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(orderStatusBreakdown).map(
                      ([status, count]) => {
                        const config = ORDER_STATUS_CONFIG[status];
                        if (!config || count === 0) return null;
                        return (
                          <div
                            key={status}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              className={`h-3 w-3 rounded-full ${STATUS_BAR_COLORS[status] || "bg-gray-300"}`}
                            />
                            <span className="text-muted-foreground">
                              {config.label}
                            </span>
                            <span className="ml-auto font-medium">{count}</span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No orders yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Top Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topBusinesses.length > 0 ? (
                <div className="space-y-3">
                  {topBusinesses.map((b, i) => (
                    <Link
                      key={b.id}
                      href={`/platform/businesses/${b.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium">{b.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {b.orderCount} orders
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No businesses yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
